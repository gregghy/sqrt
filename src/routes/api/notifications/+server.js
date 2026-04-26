import { json } from '@sveltejs/kit';
import { stmts } from '$lib/server/db.js';

export async function GET() {
    const notifications = stmts.getAllNotifications.all();
    const now = new Date();
    const currentHourMin = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const currentDay = now.getDay() || 7; // 1-7

    const triggers = [];

    for (const msg of notifications) {
        if (msg.is_active === 0) continue;

        // Check the day
        let days = [];
        try { days = JSON.parse(msg.trigger_days); } catch { }
        if (days !== 'once' && Array.isArray(days) && !days.includes(currentDay)) continue;

        // Check the exact time
        if (msg.trigger_time === currentHourMin) {
            const todayStr = now.toISOString().split('T')[0];
            if (msg.last_triggered !== todayStr) {
                triggers.push(msg);
                stmts.markNotificationTriggered.run(todayStr, msg.id);

                if (days === 'once') {
                    stmts.toggleNotification.run(msg.id); // disable
                }
            }
        }
    }

    return json({ triggers });
}
