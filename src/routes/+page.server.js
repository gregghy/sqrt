import { stmts } from '$lib/server/db.js';

function getRangeStr(view) {
    const end = new Date();
    const start = new Date();
    if (view === 'week') {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 6);
    } else if (view === 'month') {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
    } else if (view === 'year') {
        start.setMonth(0, 1);
        end.setMonth(11, 31);
    }
    return {
        s: start.toISOString().split('T')[0],
        e: end.toISOString().split('T')[0]
    };
}

export function load({ url }) {
    const todos = stmts.getAllTodos.all();
    const goals = stmts.getAllGoals.all();
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const stats = stmts.getDailyStats.get(today);

    // Enrich goals with task counts
    const goalsWithCounts = goals.map(g => {
        const counts = stmts.getGoalTaskCount.get(g.id);
        return { ...g, taskTotal: counts.total, taskDone: counts.done };
    });

    // Reading challenge
    const challenge = stmts.getChallenge.get(currentYear) || { year: currentYear, target_pages: 5000 };
    const pagesRead = stmts.getPagesReadInYear.get(currentYear.toString(), currentYear.toString()).total_pages;

    // Media stats
    const timeframes = ['week', 'month', 'year', 'all'];
    const mediaStats = {};
    for (const tf of timeframes) {
        let counts;
        if (tf === 'all') {
            counts = stmts.getMediaCountByTypeAll.all();
        } else {
            const { s, e } = getRangeStr(tf);
            counts = stmts.getMediaCountByTypeInRange.all(s, e);
        }

        mediaStats[tf] = { book: 0, comic: 0, movie: 0, game: 0 };
        for (const row of counts) {
            mediaStats[tf][row.type] = row.count;
        }
    }

    return {
        todos,
        goals: goalsWithCounts,
        stats: stats || { date: today, mood: null, energy: null, notes: '' },
        challenge: { ...challenge, current_pages: pagesRead },
        mediaStats
    };
}

export const actions = {
    addTodo: async ({ request }) => {
        const data = await request.formData();
        const text = data.get('text')?.toString().trim();
        const goalId = data.get('goal_id')?.toString();
        if (!text) return { success: false };
        stmts.insertTodo.run(text, 0, goalId && goalId !== '' ? Number(goalId) : null);
        return { success: true };
    },

    toggleTodo: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        stmts.toggleTodo.run(id);
        return { success: true };
    },

    deleteTodo: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        stmts.deleteTodo.run(id);
        return { success: true };
    },

    clearCompleted: async () => {
        stmts.clearCompleted.run();
        return { success: true };
    },

    addGoal: async ({ request }) => {
        const data = await request.formData();
        const title = data.get('title')?.toString().trim();
        const color = data.get('color')?.toString() || '#D4A373';
        if (!title) return { success: false };
        stmts.insertGoal.run(title, color);
        return { success: true };
    },

    toggleGoal: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        stmts.toggleGoal.run(id);
        return { success: true };
    },

    deleteGoal: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        stmts.deleteGoal.run(id);
        return { success: true };
    },

    updateStats: async ({ request }) => {
        const data = await request.formData();
        const today = new Date().toISOString().split('T')[0];
        const mood = Number(data.get('mood')) || null;
        const energy = Number(data.get('energy')) || null;
        const notes = data.get('notes')?.toString() || '';
        stmts.upsertDailyStats.run(today, mood, energy, notes);
        return { success: true };
    },

    updateChallenge: async ({ request }) => {
        const data = await request.formData();
        const year = Number(data.get('year'));
        const target = Number(data.get('target'));
        if (year && target) {
            stmts.upsertChallenge.run(year, target);
        }
        return { success: true };
    }
};
