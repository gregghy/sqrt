import { json } from '@sveltejs/kit';
import { getPublicKey } from '$lib/server/push.js';

export async function GET() {
    return json({ publicKey: getPublicKey() });
}
