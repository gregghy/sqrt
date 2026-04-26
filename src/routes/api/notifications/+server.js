import { json } from '@sveltejs/kit';
import { stmts } from '$lib/server/db.js';

export async function GET({ url }) {
    const notifications = stmts.getAllNotifications.all();

    // Get client's local time string, date, and day to completely bypass server timezone issues
    const currentHourMin = url.searchParams.get('time');
    const todayStr = url.searchParams.get('date');
    const currentDay = parseInt(url.searchParams.get('day'), 10);

    if (!currentHourMin || !todayStr || !currentDay) {
        return json({ triggers: [] });
    }

    const triggers = [];

    for (const msg of notifications) {
        if (msg.is_active === 0) continue;

        // Check the day using client's local day
        let days = [];
        try { days = JSON.parse(msg.trigger_days); } catch { }
        if (msg.trigger_days !== 'once' && Array.isArray(days) && !days.includes(currentDay)) continue;

        // Calculate minutes since start of day to bounded window comparisons
        const tParts = msg.trigger_time.split(':');
        const tMins = parseInt(tParts[0], 10) * 60 + parseInt(tParts[1], 10);

        const currParts = currentHourMin.split(':');
        const currMins = parseInt(currParts[0], 10) * 60 + parseInt(currParts[1], 10);

        // Check if time is a perfect match or within the last 5 minutes (handles browser sleep) using client time
        if (currMins >= tMins && (currMins - tMins) <= 5) {
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
