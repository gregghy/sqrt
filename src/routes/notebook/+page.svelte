<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fly, slide, fade } from 'svelte/transition';
	import { marked } from 'marked';

	let { data } = $props();

	let editing = $state(true);
	let editorContent = $state(data.content);
	let showNewNote = $state(false);
	let showNewFolder = $state(false);
	let newNoteName = $state('');
	let newNoteFolder = $state('');
	let newFolderName = $state('');
	let newFolderParent = $state('');
	let sidebarOpen = $state(true);
	let splitView = $state(true);
	let collapsedFolders = $state({});

	$effect(() => {
		editorContent = data.content;
	});

	let saveTimeout;
	$effect(() => {
		if (data.activeNote && editorContent !== undefined && editorContent !== data.content) {
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(async () => {
				const formData = new FormData();
				formData.append('filepath', data.activeNote);
				formData.append('content', editorContent);
				await fetch('?/save', { method: 'POST', body: formData });
				data.content = editorContent;
			}, 800);
		}
	});

	const renderedMarkdown = $derived(marked(editorContent || '', { breaks: true }));
	const activeBasename = $derived(data.activeNote ? data.activeNote.replace(/.*\//, '').replace('.md', '') : null);

	function selectNote(path) {
		goto(`/notebook?file=${encodeURIComponent(path)}`);
	}

	function toggleFolder(path) {
		collapsedFolders = { ...collapsedFolders, [path]: !collapsedFolders[path] };
	}

	function getFolderPaths(tree, prefix = '') {
		let paths = [];
		for (const item of tree) {
			if (item.type === 'folder') {
				paths.push(item.path);
				paths = paths.concat(getFolderPaths(item.children, item.path));
			}
		}
		return paths;
	}

	const folderPaths = $derived(getFolderPaths(data.tree));
</script>

<svelte:head>
	<title>√ Notebook — Life Manager</title>
</svelte:head>

<div class="notebook-layout" class:sidebar-hidden={!sidebarOpen}>
	<!-- Mobile toggle -->
	<button class="mobile-sidebar-toggle" onclick={() => sidebarOpen = !sidebarOpen}>
		{sidebarOpen ? '✕' : '☰'} Notes
	</button>

	<!-- File Browser Sidebar -->
	{#if sidebarOpen}
		<aside class="note-sidebar" transition:slide={{ axis: 'x', duration: 200 }}>
			<div class="sidebar-header">
				<h2>Notes</h2>
				<div class="sidebar-actions">
					<button class="btn-ghost-sm" title="New folder" onclick={() => { showNewFolder = !showNewFolder; showNewNote = false; }}>📁</button>
					<button class="btn-ghost-sm" title="New note" onclick={() => { showNewNote = !showNewNote; showNewFolder = false; }}>+</button>
					<button class="btn-ghost-sm collapse-sidebar-btn" title="Collapse sidebar" onclick={() => sidebarOpen = false}>◂</button>
				</div>
			</div>

			{#if showNewFolder}
				<form method="POST" action="?/createFolder" class="new-form" transition:slide={{ duration: 150 }}
					use:enhance={() => {
						return async ({ update }) => { newFolderName = ''; newFolderParent = ''; showNewFolder = false; await update(); };
					}}
				>
					<input type="text" name="name" bind:value={newFolderName} placeholder="Folder name" autocomplete="off" />
					<select name="parent" bind:value={newFolderParent}>
						<option value="">Root</option>
						{#each folderPaths as fp}<option value={fp}>{fp}</option>{/each}
					</select>
					<button type="submit" class="btn-primary btn-sm" disabled={!newFolderName.trim()}>Create</button>
				</form>
			{/if}

			{#if showNewNote}
				<form method="POST" action="?/create" class="new-form" transition:slide={{ duration: 150 }}
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success' && result.data?.created) {
								newNoteName = ''; newNoteFolder = ''; showNewNote = false;
								await update(); selectNote(result.data.created);
							}
						};
					}}
				>
					<input type="text" name="name" bind:value={newNoteName} placeholder="Note name" autocomplete="off" />
					<select name="folder" bind:value={newNoteFolder}>
						<option value="">Root</option>
						{#each folderPaths as fp}<option value={fp}>{fp}</option>{/each}
					</select>
					<button type="submit" class="btn-primary btn-sm" disabled={!newNoteName.trim()}>Create</button>
				</form>
			{/if}

			<div class="note-tree">
				{#snippet renderTree(items)}
					{#each items as item}
						{#if item.type === 'folder'}
							<div class="tree-folder">
								<div class="folder-row">
									<button class="folder-toggle" onclick={() => toggleFolder(item.path)}>
										<span class="folder-arrow">{collapsedFolders[item.path] ? '▸' : '▾'}</span>
										<span class="folder-icon">📁</span>
										<span class="folder-name">{item.name}</span>
									</button>
									<form method="POST" action="?/deleteFolder" use:enhance={() => {
										return async ({ update }) => { await update(); goto('/notebook'); };
									}}>
										<input type="hidden" name="folderpath" value={item.path} />
										<button type="submit" class="folder-delete-btn" aria-label="Delete folder" title="Delete folder and contents">×</button>
									</form>
								</div>
								{#if !collapsedFolders[item.path]}
									<div class="folder-children" transition:slide={{ duration: 150 }}>
										{@render renderTree(item.children)}
									</div>
								{/if}
							</div>
						{:else}
							<button
								class="tree-file"
								class:active={data.activeNote === item.path}
								onclick={() => selectNote(item.path)}
							>
								<span class="file-icon">📄</span>
								<span class="file-name">{item.name}</span>
							</button>
						{/if}
					{/each}
				{/snippet}

				{@render renderTree(data.tree)}

				{#if data.tree.length === 0}
					<div class="tree-empty">No notes yet</div>
				{/if}
			</div>
		</aside>
	{/if}

	<!-- Collapsed sidebar toggle (desktop) -->
	{#if !sidebarOpen}
		<button class="expand-sidebar-btn" onclick={() => sidebarOpen = true} title="Show notes">▸</button>
	{/if}

	<!-- Editor / Preview -->
	<div class="note-main">
		{#if data.activeNote}
			<div class="note-toolbar">
				<h2 class="note-title">{activeBasename}</h2>
				<div class="toolbar-actions">
					<button class="mode-btn" class:active={splitView} onclick={() => { splitView = true; editing = true; }} title="Split view">⫼</button>
					<button class="mode-btn" class:active={!splitView && editing} onclick={() => { splitView = false; editing = true; }} title="Editor only">✎</button>
					<button class="mode-btn" class:active={!splitView && !editing} onclick={() => { splitView = false; editing = false; }} title="Preview only">👁</button>

					{#if editorContent !== data.content}
						<span style="font-size: 0.75rem; color: var(--text-muted); padding: 0 8px;">Saving...</span>
					{:else}
						<span style="font-size: 0.75rem; color: var(--text-muted); padding: 0 8px;">Saved</span>
					{/if}

					<form method="POST" action="?/delete" use:enhance={() => {
						return async ({ update }) => { await update(); goto('/notebook'); };
					}}>
						<input type="hidden" name="filepath" value={data.activeNote} />
						<button type="submit" class="btn-icon-danger" aria-label="Delete note">🗑</button>
					</form>
				</div>
			</div>

			<div class="note-content" class:split={splitView}>
				{#if editing || splitView}
					<div class="editor-pane">
						<textarea
							class="markdown-editor"
							bind:value={editorContent}
							spellcheck="true"
							placeholder="Write your note in Markdown..."
						></textarea>
					</div>
				{/if}
				{#if !editing || splitView}
					<div class="preview-pane">
						<div class="markdown-preview">
							{@html renderedMarkdown}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="note-empty-state">
				<span class="empty-icon">📝</span>
				<p>Select a note or create a new one</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.notebook-layout { display: flex; height: calc(100dvh - var(--header-height)); margin: calc(-1 * var(--space-xl)) calc(-1 * var(--space-2xl)); position: relative; }

	/* ======= Sidebar ======= */
	.note-sidebar {
		width: 260px; min-width: 260px; background: var(--bg-surface);
		border-right: 1px solid var(--bg-elevated); display: flex; flex-direction: column;
		padding: var(--space-md); overflow-y: auto;
	}

	.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm); }
	.sidebar-header h2 { font-size: var(--text-base); font-weight: 600; }
	.sidebar-actions { display: flex; gap: 2px; }

	.btn-ghost-sm {
		width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
		border-radius: var(--radius-sm); font-size: var(--text-sm);
		color: var(--text-muted); transition: all var(--duration-fast) var(--ease-out);
	}
	.btn-ghost-sm:hover { background: var(--bg-elevated); color: var(--text-primary); }

	.collapse-sidebar-btn { font-size: 0.7rem; }

	.expand-sidebar-btn {
		position: absolute; left: 0; top: 50%; transform: translateY(-50%); z-index: 50;
		width: 24px; height: 48px; background: var(--bg-surface); border: 1px solid var(--bg-elevated);
		border-left: none; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		color: var(--text-muted); font-size: 0.7rem; display: flex; align-items: center; justify-content: center;
		transition: all var(--duration-fast) var(--ease-out); cursor: pointer;
	}

	@media (max-width: 768px) {
		.notebook-layout { flex-direction: column; margin: calc(-1 * var(--space-sm)); position: relative; height: auto; min-height: calc(100vh - 100px); }
		.note-sidebar { width: 100%; min-width: 100%; border-right: none; border-bottom: 1px solid var(--bg-elevated); max-height: 50vh; }
		.note-content { display: flex; flex-direction: column; width: 100%; padding: var(--space-sm); }
		.editor-pane, .preview-pane { min-height: 400px; padding: var(--space-sm); border: none; }
		.note-editor { border-top: none; }
		.expand-sidebar-btn { display: none; }
	}
	.expand-sidebar-btn:hover { background: var(--bg-elevated); color: var(--accent-primary); width: 28px; }

	/* New note/folder forms */
	.new-form { display: flex; flex-direction: column; gap: var(--space-xs); padding: var(--space-sm) 0; border-bottom: 1px solid var(--bg-elevated); margin-bottom: var(--space-sm); }
	.new-form input, .new-form select { padding: var(--space-xs) var(--space-sm); font-size: var(--text-sm); }

	/* ======= Tree view ======= */
	.note-tree { display: flex; flex-direction: column; gap: 1px; }

	.tree-folder { display: flex; flex-direction: column; }
	.folder-row { display: flex; align-items: center; width: 100%; transition: background var(--duration-fast) var(--ease-out); border-radius: var(--radius-sm); }
	.folder-row:hover { background: var(--bg-elevated); }
	.folder-toggle {
		display: flex; align-items: center; gap: var(--space-xs); padding: 4px var(--space-xs);
		font-size: var(--text-sm); color: var(--text-secondary);
		flex: 1; text-align: left; background: none;
	}
	.folder-delete-btn {
		width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
		border-radius: var(--radius-sm); color: var(--text-muted); opacity: 0;
		transition: all var(--duration-fast) var(--ease-out); background: none;
	}
	.folder-row:hover .folder-delete-btn { opacity: 1; }
	.folder-delete-btn:hover { background: var(--accent-secondary-muted); color: var(--color-danger); }
	.folder-arrow { font-size: 0.6rem; width: 12px; text-align: center; }
	.folder-icon { font-size: var(--text-sm); }
	.folder-name { font-weight: 500; }
	.folder-children { padding-left: var(--space-md); }

	.tree-file {
		display: flex; align-items: center; gap: var(--space-sm); width: 100%; text-align: left;
		padding: 4px var(--space-sm); border-radius: var(--radius-sm); font-size: var(--text-sm);
		color: var(--text-secondary); transition: all var(--duration-fast) var(--ease-out);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}
	.tree-file:hover { background: var(--bg-elevated); color: var(--text-primary); }
	.tree-file.active { background: var(--accent-primary-muted); color: var(--accent-primary); }
	.file-icon { font-size: var(--text-sm); flex-shrink: 0; }
	.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tree-empty { padding: var(--space-lg); text-align: center; color: var(--text-muted); font-size: var(--text-sm); }

	/* ======= Toolbar ======= */
	.note-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

	.note-toolbar {
		display: flex; justify-content: space-between; align-items: center;
		padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--bg-elevated);
		background: var(--bg-surface); gap: var(--space-sm);
	}
	.note-title { font-size: var(--text-base); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.toolbar-actions { display: flex; gap: var(--space-xs); align-items: center; }

	.mode-btn {
		width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
		border-radius: var(--radius-sm); font-size: var(--text-sm); color: var(--text-muted);
		transition: all var(--duration-fast) var(--ease-out);
	}
	.mode-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
	.mode-btn.active { background: var(--accent-primary-muted); color: var(--accent-primary); }

	/* ======= Content ======= */
	.note-content { flex: 1; display: flex; overflow: hidden; }
	.note-content.split { display: flex; }

	.editor-pane, .preview-pane { flex: 1; overflow-y: auto; min-width: 0; }
	.note-content.split .editor-pane { border-right: 1px solid var(--bg-elevated); }

	.markdown-editor {
		width: 100%; height: 100%; min-height: 400px; padding: var(--space-md);
		background: var(--bg-app); border: none; resize: none;
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
		font-size: var(--text-sm); line-height: 1.7; color: var(--text-primary); outline: none;
	}

	.markdown-preview { padding: var(--space-md); line-height: 1.8; }
	.markdown-preview :global(h1) { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 1px solid var(--bg-elevated); }
	.markdown-preview :global(h2) { font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-xl); margin-bottom: var(--space-sm); }
	.markdown-preview :global(h3) { font-size: var(--text-lg); font-weight: 600; margin-top: var(--space-lg); margin-bottom: var(--space-sm); }
	.markdown-preview :global(p) { margin-bottom: var(--space-md); color: var(--text-primary); }
	.markdown-preview :global(ul), .markdown-preview :global(ol) { padding-left: var(--space-lg); margin-bottom: var(--space-md); }
	.markdown-preview :global(li) { margin-bottom: var(--space-xs); }
	.markdown-preview :global(code) { background: var(--bg-elevated); padding: 2px 6px; border-radius: var(--radius-sm); font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.9em; color: var(--accent-primary); }
	.markdown-preview :global(pre) { background: var(--bg-elevated); padding: var(--space-md); border-radius: var(--radius-md); overflow-x: auto; margin-bottom: var(--space-md); }
	.markdown-preview :global(pre code) { background: none; padding: 0; color: var(--text-primary); }
	.markdown-preview :global(blockquote) { border-left: 3px solid var(--accent-primary); padding-left: var(--space-md); color: var(--text-secondary); margin-bottom: var(--space-md); }
	.markdown-preview :global(strong) { color: var(--text-primary); font-weight: 600; }
	.markdown-preview :global(a) { color: var(--accent-primary); text-decoration: underline; text-underline-offset: 2px; }
	.markdown-preview :global(hr) { border: none; border-top: 1px solid var(--bg-elevated); margin: var(--space-lg) 0; }

	/* ======= Empty State ======= */
	.note-empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-md); color: var(--text-muted); }
	.note-empty-state .empty-icon { font-size: 3rem; }

	/* ======= Buttons ======= */
	.btn-primary { background: var(--accent-primary); color: var(--text-inverse); font-weight: 600; padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); transition: all var(--duration-fast) var(--ease-out); }
	.btn-primary:hover:not(:disabled) { background: var(--accent-primary-hover); }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-sm { padding: var(--space-xs) var(--space-sm); font-size: var(--text-sm); }
	.btn-icon-danger { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--text-muted); font-size: var(--text-base); transition: all var(--duration-fast) var(--ease-out); }
	.btn-icon-danger:hover { background: var(--accent-secondary-muted); color: var(--color-danger); }

	/* ======= Mobile toggle ======= */
	.mobile-sidebar-toggle { display: none; }

	@media (max-width: 768px) {
		.notebook-layout { flex-direction: column; height: calc(100dvh - var(--nav-height)); margin: calc(-1 * var(--space-md)); }
		.note-sidebar { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 200; background: var(--bg-surface); }
		.notebook-layout:not(.sidebar-hidden) .note-sidebar { display: flex; }
		.mobile-sidebar-toggle { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: var(--bg-surface); border-bottom: 1px solid var(--bg-elevated); font-weight: 500; font-size: var(--text-sm); color: var(--accent-primary); }
		.expand-sidebar-btn { display: none; }
		.note-content.split { flex-direction: column; }
		.note-content.split .editor-pane { border-right: none; border-bottom: 1px solid var(--bg-elevated); }
	}
</style>
