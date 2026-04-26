import { stmts } from '$lib/server/db.js';

function getDateRange(view) {
    const end = new Date();
    const start = new Date();

    switch (view) {
        case 'week':
            start.setDate(start.getDate() - 6);
            break;
        case 'month':
            start.setDate(start.getDate() - 29);
            break;
        case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
        case 'all': {
            const earliest = stmts.getHabitEarliestLog.get();
            if (earliest?.earliest) {
                start.setTime(new Date(earliest.earliest + 'T00:00:00').getTime());
            } else {
                start.setDate(start.getDate() - 6);
            }
            break;
        }
        default:
            start.setDate(start.getDate() - 6);
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

function generateDateGrid(startStr, endStr) {
    const dates = [];
    const start = new Date(startStr + 'T12:00:00');
    const end = new Date(endStr + 'T12:00:00');
    const current = new Date(start);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export function load({ url }) {
    const view = url.searchParams.get('view') || 'week';
    const habits = stmts.getAllHabits.all();
    const { start, end } = getDateRange(view);
    const logs = stmts.getAllHabitLogsRange.all(start, end);
    const dateGrid = generateDateGrid(start, end);
    const today = new Date().toISOString().split('T')[0];

    const logMap = {};
    for (const log of logs) {
        if (log.completed) {
            if (!logMap[log.habit_id]) logMap[log.habit_id] = [];
            logMap[log.habit_id].push(log.date);
        }
    }

    return { habits, logMap, dateGrid, today, view };
}

export const actions = {
    addHabit: async ({ request }) => {
        const data = await request.formData();
        const name = data.get('name')?.toString().trim();
        const icon = data.get('icon')?.toString().trim() || '◉';
        const color = data.get('color')?.toString() || '#D4A373';
        if (!name) return { success: false };
        stmts.insertHabit.run(name, icon, color);
        return { success: true };
    },

    deleteHabit: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        stmts.deleteHabit.run(id);
        return { success: true };
    },

    toggleHabit: async ({ request }) => {
        const data = await request.formData();
        const habitId = Number(data.get('habitId'));
        const date = data.get('date')?.toString();
        if (!habitId || !date) return { success: false };
        stmts.toggleHabitLog.run(habitId, date);
        return { success: true };
    }
};
