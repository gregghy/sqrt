import Database from 'better-sqlite3';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = resolve(process.cwd(), 'data');

if (!existsSync(DATA_DIR)) {
	mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(resolve(DATA_DIR, 'sqrt.db'));

// Performance pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// ============================================
// Schema
// ============================================

db.exec(`
	CREATE TABLE IF NOT EXISTS goals (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		completed INTEGER NOT NULL DEFAULT 0,
		color TEXT NOT NULL DEFAULT '#D4A373',
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		completed_at TEXT
	);

	CREATE TABLE IF NOT EXISTS todos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		text TEXT NOT NULL,
		completed INTEGER NOT NULL DEFAULT 0,
		priority INTEGER NOT NULL DEFAULT 0,
		goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		completed_at TEXT
	);

	CREATE TABLE IF NOT EXISTS habits (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		icon TEXT NOT NULL DEFAULT '◉',
		color TEXT NOT NULL DEFAULT '#D4A373',
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS habit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
		date TEXT NOT NULL,
		completed INTEGER NOT NULL DEFAULT 1,
		UNIQUE(habit_id, date)
	);

	CREATE TABLE IF NOT EXISTS daily_stats (
		date TEXT PRIMARY KEY,
		mood INTEGER,
		energy INTEGER,
		notes TEXT
	);

	-- Library: unified media table
	CREATE TABLE IF NOT EXISTS media (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		type TEXT NOT NULL CHECK(type IN ('book', 'comic', 'movie', 'game')),
		title TEXT NOT NULL,
		author TEXT,
		total_pages INTEGER,
		pages_read INTEGER NOT NULL DEFAULT 0,
		date_started TEXT,
		date_finished TEXT,
		rating INTEGER,
		notes TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now'))
	);

	-- Reading challenge: yearly page goals
	CREATE TABLE IF NOT EXISTS reading_challenges (
		year INTEGER PRIMARY KEY,
		target_pages INTEGER NOT NULL DEFAULT 5000
	);

	-- Notifications
	CREATE TABLE IF NOT EXISTS notifications (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		message TEXT NOT NULL,
		trigger_time TEXT NOT NULL,
		trigger_days TEXT NOT NULL,
		is_active INTEGER DEFAULT 1,
		last_triggered TEXT
	);
`);

// Migrations for existing databases
try { db.exec(`ALTER TABLE todos ADD COLUMN goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL`); } catch { }

// ============================================
// Prepared Statements
// ============================================

// Notification Push Subscriptions (For background native delivery)
db.exec(`
	CREATE TABLE IF NOT EXISTS push_subscriptions (
		endpoint TEXT PRIMARY KEY,
		p256dh TEXT NOT NULL,
		auth TEXT NOT NULL,
		timezone TEXT NOT NULL
	);
`);

export const pushStmts = {
	saveSub: db.prepare('INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth, timezone) VALUES (?, ?, ?, ?)'),
	getAllSubs: db.prepare('SELECT * FROM push_subscriptions'),
	deleteSub: db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
};

export const stmts = {
	// Todos
	getAllTodos: db.prepare(`
		SELECT t.*, g.title as goal_title, g.color as goal_color
		FROM todos t LEFT JOIN goals g ON t.goal_id = g.id
		ORDER BY t.completed ASC, t.priority DESC, t.created_at DESC
	`),
	insertTodo: db.prepare('INSERT INTO todos (text, priority, goal_id) VALUES (?, ?, ?)'),
	toggleTodo: db.prepare(`UPDATE todos SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END, completed_at = CASE WHEN completed = 0 THEN datetime('now') ELSE NULL END WHERE id = ?`),
	deleteTodo: db.prepare('DELETE FROM todos WHERE id = ?'),
	clearCompleted: db.prepare('DELETE FROM todos WHERE completed = 1'),

	// Goals
	getAllGoals: db.prepare('SELECT * FROM goals ORDER BY completed ASC, created_at DESC'),
	insertGoal: db.prepare('INSERT INTO goals (title, color) VALUES (?, ?)'),
	toggleGoal: db.prepare(`UPDATE goals SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END, completed_at = CASE WHEN completed = 0 THEN datetime('now') ELSE NULL END WHERE id = ?`),
	deleteGoal: db.prepare('DELETE FROM goals WHERE id = ?'),
	getGoalTaskCount: db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as done FROM todos WHERE goal_id = ?'),

	// Habits
	getAllHabits: db.prepare('SELECT * FROM habits ORDER BY created_at ASC'),
	insertHabit: db.prepare('INSERT INTO habits (name, icon, color) VALUES (?, ?, ?)'),
	deleteHabit: db.prepare('DELETE FROM habits WHERE id = ?'),
	toggleHabitLog: db.prepare(`
		INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)
		ON CONFLICT(habit_id, date) DO UPDATE SET completed = CASE WHEN completed = 1 THEN 0 ELSE 1 END
	`),
	getHabitLogs: db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date BETWEEN ? AND ?'),
	getAllHabitLogsRange: db.prepare('SELECT * FROM habit_logs WHERE date BETWEEN ? AND ?'),
	getHabitEarliestLog: db.prepare('SELECT MIN(date) as earliest FROM habit_logs'),

	// Media / Library
	getAllMedia: db.prepare('SELECT * FROM media ORDER BY created_at DESC'),
	getMediaByType: db.prepare('SELECT * FROM media WHERE type = ? ORDER BY created_at DESC'),
	insertMedia: db.prepare('INSERT INTO media (type, title, author, total_pages, pages_read, date_started, date_finished, rating, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
	updateMedia: db.prepare('UPDATE media SET title=?, author=?, total_pages=?, pages_read=?, date_started=?, date_finished=?, rating=?, notes=? WHERE id=?'),
	deleteMedia: db.prepare('DELETE FROM media WHERE id = ?'),

	// Media stats for home page
	getMediaCountByTypeInRange: db.prepare(`
		SELECT type, COUNT(*) as count FROM media
		WHERE date_finished IS NOT NULL AND date_finished BETWEEN ? AND ?
		GROUP BY type
	`),
	getMediaCountByTypeAll: db.prepare(`
		SELECT type, COUNT(*) as count FROM media
		WHERE date_finished IS NOT NULL
		GROUP BY type
	`),
	// Pages read in a year (for reading challenge) — books & comics started or finished in that year
	getPagesReadInYear: db.prepare(`
		SELECT COALESCE(SUM(pages_read), 0) as total_pages FROM media
		WHERE type IN ('book', 'comic')
		AND (
			(date_started IS NOT NULL AND date_started LIKE ? || '%')
			OR (date_finished IS NOT NULL AND date_finished LIKE ? || '%')
		)
	`),

	// Reading challenges
	getChallenge: db.prepare('SELECT * FROM reading_challenges WHERE year = ?'),
	upsertChallenge: db.prepare(`
		INSERT INTO reading_challenges (year, target_pages) VALUES (?, ?)
		ON CONFLICT(year) DO UPDATE SET target_pages = excluded.target_pages
	`),

	// Daily Stats
	getDailyStats: db.prepare('SELECT * FROM daily_stats WHERE date = ?'),
	upsertDailyStats: db.prepare(`
		INSERT INTO daily_stats (date, mood, energy, notes) VALUES (?, ?, ?, ?)
		ON CONFLICT(date) DO UPDATE SET mood = excluded.mood, energy = excluded.energy, notes = excluded.notes
	`),

	// Notifications
	getAllNotifications: db.prepare('SELECT * FROM notifications ORDER BY trigger_time ASC'),
	insertNotification: db.prepare('INSERT INTO notifications (title, message, trigger_time, trigger_days, is_active) VALUES (?, ?, ?, ?, 1)'),
	updateNotification: db.prepare('UPDATE notifications SET title = ?, message = ?, trigger_time = ?, trigger_days = ? WHERE id = ?'),
	toggleNotification: db.prepare('UPDATE notifications SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?'),
	deleteNotification: db.prepare('DELETE FROM notifications WHERE id = ?'),
	markNotificationTriggered: db.prepare('UPDATE notifications SET last_triggered = ? WHERE id = ?')
};

export default db;
export { stmts };
