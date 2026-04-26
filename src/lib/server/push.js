import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { db, pushStmts, stmts } from './db.js';

// Get app data directory to safely store keys alongside db
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

export function initPushServer() {
    let vapidKeys;
    const vapidPath = path.join(dataDir, 'vapid.json');

    if (fs.existsSync(vapidPath)) {
        vapidKeys = JSON.parse(fs.readFileSync(vapidPath, 'utf8'));
    } else {
        vapidKeys = webpush.generateVAPIDKeys();
        fs.writeFileSync(vapidPath, JSON.stringify(vapidKeys));
    }

    webpush.setVapidDetails(
        'mailto:admin@local.host',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );

    console.log("[PUSH] Native Web Push Engine Initialized");

    // Start the Server-Side Polling Engine
    setInterval(runPushScheduler, 60000); // Check once per minute
    runPushScheduler();
}

export function getPublicKey() {
    const vapidPath = path.join(dataDir, 'vapid.json');
    if (fs.existsSync(vapidPath)) {
        return JSON.parse(fs.readFileSync(vapidPath, 'utf8')).publicKey;
    }
    return null;
}

async function runPushScheduler() {
    try {
        const subs = pushStmts.getAllSubs.all();
        if (subs.length === 0) return;

        const notifications = stmts.getAllNotifications.all();

        for (const sub of subs) {
            const tz = sub.timezone || 'UTC';
            const dateOpts = { timeZone: tz, hour12: false };

            const nowStr = new Date().toLocaleString("en-US", dateOpts);
            const dParts = nowStr.split(', '); // "MM/DD/YYYY, 21:00:00"

            // Format "2026-04-26"
            const dComps = dParts[0].split('/'); // [MM, DD, YYYY]
            const todayStr = `${dComps[2]}-${dComps[0].padStart(2, '0')}-${dComps[1].padStart(2, '0')}`;

            // Format "HH:mm"
            const tComps = dParts[1].split(':');
            const currentHourMin = `${tComps[0].replace('24', '00').padStart(2, '0')}:${tComps[1]}`;

            // Compute Day 1-7 (Mon-Sun)
            const dateObj = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
            const currentDay = dateObj.getDay() || 7;

            const currMins = parseInt(tComps[0].replace('24', '00'), 10) * 60 + parseInt(tComps[1], 10);

            for (const msg of notifications) {
                if (msg.is_active === 0) continue;

                let days = [];
                try { days = JSON.parse(msg.trigger_days); } catch { }
                if (msg.trigger_days !== 'once' && Array.isArray(days) && !days.includes(currentDay)) continue;

                const targetParts = msg.trigger_time.split(':');
                const tMins = parseInt(targetParts[0], 10) * 60 + parseInt(targetParts[1], 10);

                // Rolling 5 min window to ensure mathematically triggered limits
                if (currMins >= tMins && (currMins - tMins) <= 5) {
                    if (msg.last_triggered !== todayStr) {
                        // FIRE PUSH!
                        const payload = JSON.stringify({
                            title: msg.title,
                            body: msg.message,
                            icon: '/favicon.svg'
                        });

                        const subscription = {
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth }
                        };

                        try {
                            await webpush.sendNotification(subscription, payload);
                            console.log(`[PUSH] Successful native dispatch to endpoint: ${msg.title}`);
                        } catch (error) {
                            console.error(`[PUSH] Failed payload dispatch:`, error);
                            if (error.statusCode === 410 || error.statusCode === 404) {
                                pushStmts.deleteSub.run(sub.endpoint);
                            }
                            continue;
                        }

                        // Save to DB
                        stmts.markNotificationTriggered.run(todayStr, msg.id);
                        if (msg.trigger_days === 'once') {
                            stmts.toggleNotification.run(msg.id);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("[PUSH] Scheduler execution fault:", e);
    }
}
