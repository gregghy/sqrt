import { json } from '@sveltejs/kit';
import { pushStmts } from '$lib/server/db.js';

export async function POST({ request }) {
    try {
        const { subscription, timezone } = await request.json();

        if (!subscription || !subscription.endpoint) {
            return json({ error: "Invalid subscription" }, { status: 400 });
        }

        pushStmts.saveSub.run(
            subscription.endpoint,
            subscription.keys.p256dh,
            subscription.keys.auth,
            timezone || 'UTC'
        );

        return json({ success: true });
    } catch (e) {
        console.error("[PUSH] Subscription failure", e);
        return json({ error: "Failed to save subscription" }, { status: 500 });
    }
}
