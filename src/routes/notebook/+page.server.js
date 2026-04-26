import { readdir, readFile, writeFile, mkdir, unlink, stat } from 'fs/promises';
import { resolve, join, extname, basename, dirname, relative } from 'path';
import { existsSync } from 'fs';

const VAULT_DIR = resolve(process.cwd(), 'vault');

async function ensureVault() {
    if (!existsSync(VAULT_DIR)) {
        await mkdir(VAULT_DIR, { recursive: true });
        await writeFile(
            join(VAULT_DIR, 'Welcome.md'),
            `# Welcome to your Notebook\n\nThis is your personal knowledge base. Create, edit, and organize your notes right here in the browser.\n\n## Tips\n- Notes are stored as **markdown files** on your server\n- You can organize notes into **folders**\n- You can access them from any device via Tailscale\n- Files are compatible with Obsidian and other markdown editors\n\nHappy writing! ✍️\n`
        );
    }
}

async function listTree(dir, prefix = '') {
    const entries = await readdir(dir, { withFileTypes: true });
    const items = [];

    // Sort: folders first, then files, alphabetically
    const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            const children = await listTree(join(dir, entry.name), relPath);
            items.push({ type: 'folder', name: entry.name, path: relPath, children });
        } else if (extname(entry.name).toLowerCase() === '.md') {
            items.push({ type: 'file', name: basename(entry.name, '.md'), filename: entry.name, path: relPath });
        }
    }

    return items;
}

function safePath(userPath) {
    // Prevent path traversal
    const resolved = resolve(VAULT_DIR, userPath);
    if (!resolved.startsWith(VAULT_DIR)) throw new Error('Invalid path');
    return resolved;
}

async function readNote(relPath) {
    try {
        const filepath = safePath(relPath);
        return await readFile(filepath, 'utf-8');
    } catch {
        return '';
    }
}

export async function load({ url }) {
    await ensureVault();
    const tree = await listTree(VAULT_DIR);
    const activeFile = url.searchParams.get('file');
    let content = '';
    let activeNote = null;

    if (activeFile) {
        content = await readNote(activeFile);
        activeNote = activeFile;
    }

    return { tree, content, activeNote };
}

export const actions = {
    save: async ({ request }) => {
        await ensureVault();
        const data = await request.formData();
        const filePath = data.get('filepath')?.toString() || '';
        const content = data.get('content')?.toString() || '';
        if (!filePath) return { success: false };
        try {
            const fullPath = safePath(filePath);
            await writeFile(fullPath, content, 'utf-8');
            return { success: true, saved: filePath };
        } catch {
            return { success: false };
        }
    },

    create: async ({ request }) => {
        await ensureVault();
        const data = await request.formData();
        let name = data.get('name')?.toString().trim() || 'Untitled';
        const folder = data.get('folder')?.toString() || '';
        if (!name.endsWith('.md')) name += '.md';

        try {
            const relPath = folder ? `${folder}/${name}` : name;
            const fullPath = safePath(relPath);
            const dir = dirname(fullPath);
            if (!existsSync(dir)) await mkdir(dir, { recursive: true });
            if (!existsSync(fullPath)) {
                await writeFile(fullPath, `# ${basename(name, '.md')}\n\n`, 'utf-8');
            }
            return { success: true, created: relPath };
        } catch {
            return { success: false };
        }
    },

    createFolder: async ({ request }) => {
        await ensureVault();
        const data = await request.formData();
        const name = data.get('name')?.toString().trim() || '';
        const parent = data.get('parent')?.toString() || '';
        if (!name) return { success: false };

        try {
            const relPath = parent ? `${parent}/${name}` : name;
            const fullPath = safePath(relPath);
            if (!existsSync(fullPath)) await mkdir(fullPath, { recursive: true });
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    delete: async ({ request }) => {
        const data = await request.formData();
        const filePath = data.get('filepath')?.toString() || '';
        if (!filePath) return { success: false };
        try {
            const fullPath = safePath(filePath);
            await unlink(fullPath);
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    deleteFolder: async ({ request }) => {
        const data = await request.formData();
        const folderPath = data.get('folderpath')?.toString() || '';
        if (!folderPath) return { success: false };
        try {
            const fullPath = safePath(folderPath);
            if (fullPath === VAULT_DIR) return { success: false };
            const { rm } = await import('fs/promises');
            await rm(fullPath, { recursive: true, force: true });
            return { success: true };
        } catch {
            return { success: false };
        }
    }
};
