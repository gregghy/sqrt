import { initPushServer } from '$lib/server/push.js';

initPushServer();

export async function handle({ event, resolve }) {
    return resolve(event);
}
