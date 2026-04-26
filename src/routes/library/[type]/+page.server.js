import { stmts } from '$lib/server/db.js';

export function load({ params }) {
    const type = params.type; // 'book', 'comic', 'movie', 'game'
    const items = stmts.getMediaByType.all(type);
    return { type, items };
}

export const actions = {
    add: async ({ request, params }) => {
        const data = await request.formData();
        const type = params.type;
        const title = data.get('title')?.toString().trim();
        if (!title) return { success: false };

        const author = data.get('author')?.toString().trim() || null;
        const total_pages = Number(data.get('total_pages')) || null;
        const pages_read = Number(data.get('pages_read')) || 0;
        const date_started = data.get('date_started')?.toString() || null;
        const date_finished = data.get('date_finished')?.toString() || null;
        const rating = Number(data.get('rating')) || null;
        const notes = data.get('notes')?.toString() || null;

        stmts.insertMedia.run(type, title, author, total_pages, pages_read, date_started, date_finished, rating, notes);
        return { success: true };
    },

    update: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        if (!id) return { success: false };

        const title = data.get('title')?.toString().trim();
        if (!title) return { success: false };

        const author = data.get('author')?.toString().trim() || null;
        const total_pages = Number(data.get('total_pages')) || null;
        const pages_read = Number(data.get('pages_read')) || 0;
        const date_started = data.get('date_started')?.toString() || null;
        const date_finished = data.get('date_finished')?.toString() || null;
        const rating = Number(data.get('rating')) || null;
        const notes = data.get('notes')?.toString() || null;

        stmts.updateMedia.run(title, author, total_pages, pages_read, date_started, date_finished, rating, notes, id);
        return { success: true };
    },

    delete: async ({ request }) => {
        const data = await request.formData();
        const id = Number(data.get('id'));
        if (id) stmts.deleteMedia.run(id);
        return { success: true };
    }
};
