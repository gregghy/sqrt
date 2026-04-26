import { json } from '@sveltejs/kit';
import { stmts } from '$lib/server/db.js';

export async function GET() {
    const notifications = stmts.getAllNotifications.all();
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const currentHourMin = `${h}:${m}`;
    const currentDay = now.getDay() || 7; // 1-7

    const triggers = [];

    for (const msg of notifications) {
        if (msg.is_active === 0) continue;

        // Check the day
        let days = [];
        try { days = JSON.parse(msg.trigger_days); } catch { }
        if (msg.trigger_days !== 'once' && Array.isArray(days) && !days.includes(currentDay)) continue;

        // Calculate minutes since start of day to bounded window comparisons
        const tParts = msg.trigger_time.split(':');
        const tMins = parseInt(tParts[0], 10) * 60 + parseInt(tParts[1], 10);
        const currMins = now.getHours() * 60 + now.getMinutes();

        // Check if time is a perfect match or within the last 5 minutes (handles browser sleep)
        if (currMins >= tMins && (currMins - tMins) <= 5) {
            // Ensure it uses local 'today' based on timezone
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            if (msg.last_triggered !== todayStr) {
                triggers.push(msg);
                stmts.markNotificationTriggered.run(todayStr, msg.id);

                if (msg.trigger_days === 'once') {
                    stmts.toggleNotification.run(msg.id); // disable
                }
            }
        }
    }

    return json({ triggers });
}
