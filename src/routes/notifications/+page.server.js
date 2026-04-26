import { stmts } from '$lib/server/db.js';

export function load() {
    const notifications = stmts.getAllNotifications.all();
    return { notifications };
}

export const actions = {
    add: async ({ request }) => {
        const data = await request.formData();
        const title = data.get('title')?.toString().trim();
        const message = data.get('message')?.toString().trim();
        const trigger_time = data.get('trigger_time')?.toString().trim();

        let trigger_days = data.get('trigger_days')?.toString() || 'once';
        if (trigger_days !== 'once') {
            // Convert comma list to JSON array
            const arr = trigger_days.split(',').map(Number).filter(n => !isNaN(n));
            if (arr.length > 0) {
                trigger_days = JSON.stringify(arr);
            } else {
                trigger_days = 'once';
            }
        }

        if (title && message && trigger_time) {
            stmts.insertNotification.run(title, message, trigger_time, trigger_days);
        }
        return { success: true };
    },

    toggle: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        stmts.toggleNotification.run(id);
        return { success: true };
    },

    delete: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        stmts.deleteNotification.run(id);
        return { success: true };
    }
};
