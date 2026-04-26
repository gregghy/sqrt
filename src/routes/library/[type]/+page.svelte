<script>
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	let { data } = $props();

	let showAddForm = $state(false);
	let editItemId = $state(null);

	const typeNames = {
		book: 'Book',
		comic: 'Comic',
		movie: 'Movie',
		game: 'Videogame'
	};

	let newItem = $state({
		title: '', author: '',
		total_pages: '', pages_read: '',
		date_started: '', date_finished: '',
		rating: '', notes: ''
	});

	let filterAuthor = $state('');
	let filterYear = $state('');
	let filterRating = $state('');

	const uniqueAuthors = $derived([...new Set(data.items.map(i => i.author).filter(Boolean))].sort());
	const uniqueYears = $derived([...new Set(data.items.flatMap(i => [
		i.date_started?.substring(0,4), 
		i.date_finished?.substring(0,4)
	]).filter(Boolean))].sort().reverse());

	const filteredItems = $derived(data.items.filter(item => {
		if (filterAuthor && item.author !== filterAuthor) return false;
		if (filterRating && item.rating != filterRating) return false;
		if (filterYear) {
			const y1 = item.date_started?.substring(0,4);
			const y2 = item.date_finished?.substring(0,4);
			if (y1 !== filterYear && y2 !== filterYear) return false;
		}
		return true;
	}));

	function resetForm() {
		newItem = { title: '', author: '', total_pages: '', pages_read: '', date_started: '', date_finished: '', rating: '', notes: '' };
		showAddForm = false;
	}

	function toggleAddForm() {
		if (showAddForm) {
			resetForm();
		} else {
			newItem = { title: '', author: '', total_pages: '', pages_read: '', date_started: '', date_finished: '', rating: '', notes: '' };
			editItemId = null;
			showAddForm = true;
		}
	}

	function startEdit(item) {
		editItemId = item.id;
		newItem = { ...item };
	}

	function cancelEdit() {
		editItemId = null;
		resetForm();
	}
</script>

<svelte:head>
	<title>√ {typeNames[data.type]}s — Library</title>
</svelte:head>

<div class="media-page">
	<div class="page-actions">
		<h2>{typeNames[data.type]}s</h2>
		<button class="btn-primary" onclick={toggleAddForm}>
			{showAddForm ? 'Cancel' : `+ New ${typeNames[data.type]}`}
		</button>
	</div>

	{#if data.items.length > 0}
		<div class="filter-bar">
			<select bind:value={filterAuthor}>
				<option value="">Any Author/Creator</option>
				{#each uniqueAuthors as auth}<option value={auth}>{auth}</option>{/each}
			</select>
			<select bind:value={filterYear}>
				<option value="">Any Year</option>
				{#each uniqueYears as yr}<option value={yr}>{yr}</option>{/each}
			</select>
			<select bind:value={filterRating}>
				<option value="">Any Rating</option>
				<option value="5">★★★★★</option>
				<option value="4">★★★★☆</option>
				<option value="3">★★★☆☆</option>
				<option value="2">★★☆☆☆</option>
				<option value="1">★☆☆☆☆</option>
			</select>
			{#if filterAuthor || filterYear || filterRating}
				<button class="btn-ghost-sm" onclick={() => { filterAuthor = ''; filterYear = ''; filterRating = ''; }}>Clear Filters</button>
			{/if}
		</div>
	{/if}

	{#if showAddForm || editItemId}
		<form method="POST" action={editItemId ? '?/update' : '?/add'} class="card media-form" transition:slide={{ duration: 200 }}
			use:enhance={() => {
				return async ({ update }) => { resetForm(); editItemId = null; await update(); };
			}}
		>
			{#if editItemId}
				<input type="hidden" name="id" value={editItemId} />
			{/if}

			<div class="form-grid">
				<div class="form-group span-2">
					<label>Title <span class="req">*</span></label>
					<input type="text" name="title" bind:value={newItem.title} required placeholder="Title" />
				</div>
				<div class="form-group span-2">
					<label>{data.type === 'movie' ? 'Director' : data.type === 'game' ? 'Studio' : 'Author'}</label>
					<input type="text" name="author" bind:value={newItem.author} placeholder={data.type === 'movie' ? 'Director' : 'Author'} />
				</div>

				{#if data.type === 'book' || data.type === 'comic'}
					<div class="form-group">
						<label>Total Pages</label>
						<input type="number" name="total_pages" bind:value={newItem.total_pages} placeholder="e.g. 300" />
					</div>
					<div class="form-group">
						<label>Pages Read</label>
						<input type="number" name="pages_read" bind:value={newItem.pages_read} placeholder="e.g. 50" />
					</div>
				{/if}

				<div class="form-group">
					<label>Date Started</label>
					<input type="date" name="date_started" bind:value={newItem.date_started} />
				</div>
				<div class="form-group">
					<label>Date Finished</label>
					<input type="date" name="date_finished" bind:value={newItem.date_finished} />
				</div>

				<div class="form-group">
					<label>Rating (1-5)</label>
					<input type="number" name="rating" min="1" max="5" bind:value={newItem.rating} placeholder="Stars" />
				</div>
				<div class="form-group span-full">
					<label>Notes</label>
					<textarea name="notes" bind:value={newItem.notes} placeholder="Thoughts, reviews, quotes..." rows="2"></textarea>
				</div>
			</div>

			<div class="form-actions">
				{#if editItemId}
					<button type="button" class="btn-ghost" onclick={cancelEdit}>Cancel</button>
				{/if}
				<button type="submit" class="btn-primary" disabled={!newItem.title.trim()}>
					{editItemId ? 'Update' : 'Add'}
				</button>
			</div>
		</form>
	{/if}

	<div class="media-list">
		{#if data.items.length === 0 && !showAddForm}
			<div class="empty-state">
				<span class="empty-icon">📂</span>
				<p>No {typeNames[data.type].toLowerCase()}s yet. Add one to start tracking!</p>
			</div>
		{/if}

		{#each filteredItems as item (item.id)}
			<div class="card media-card" animate:flip={{ duration: 250 }}>
				<div class="media-main">
					<div class="media-info">
						<h3 class="media-title">{item.title}</h3>
						{#if item.author}<p class="media-author">{item.author}</p>{/if}
					</div>
					<div class="media-status">
						{#if item.rating}
							<span class="media-rating" title="Rating">
								{#each Array(item.rating) as _}★{/each}
							</span>
						{/if}
						{#if item.date_finished}
							<span class="badge badge-success">Finished {item.date_finished}</span>
						{:else if item.date_started}
							<span class="badge badge-active">Started {item.date_started}</span>
						{/if}
					</div>
				</div>

				{#if (data.type === 'book' || data.type === 'comic') && item.total_pages}
					<div class="media-progress">
						<div class="progress-bar">
							<div class="progress-fill" style="width: {Math.min(100, Math.round(((item.pages_read || 0) / item.total_pages) * 100))}%;"></div>
						</div>
						<span class="progress-text">
							{item.pages_read || 0} / {item.total_pages} pages ({Math.round(((item.pages_read || 0) / item.total_pages) * 100)}%)
						</span>
					</div>
				{/if}

				{#if item.notes}
					<div class="media-notes">
						{item.notes}
					</div>
				{/if}

				<div class="media-actions">
					<button class="btn-ghost-sm" onclick={() => startEdit(item)}>Edit</button>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={item.id} />
						<button type="submit" class="btn-icon-danger btn-sm">Delete</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.media-page { display: flex; flex-direction: column; gap: var(--space-lg); max-width: 100%; }
	.page-actions { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-sm); }
	.page-actions h2 { font-size: var(--text-lg); font-weight: 600; }

	.card { background: var(--bg-surface); border: 1px solid var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-lg); }

	.filter-bar { display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap; margin-bottom: var(--space-sm); }
	.filter-bar select { padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--bg-elevated); background: var(--bg-app); color: var(--text-primary); font-size: var(--text-sm); }
	
	.form-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); margin-bottom: var(--space-md); }
	.form-group { display: flex; flex-direction: column; gap: var(--space-xs); }
	.form-group.span-2 { grid-column: span 2; }
	.form-group.span-full { grid-column: 1 / -1; }
	.form-group label { font-size: var(--text-xs); font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
	.req { color: var(--color-danger); }
	.form-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); border-top: 1px solid var(--bg-elevated); padding-top: var(--space-md); }

	.media-list { display: flex; flex-direction: column; gap: var(--space-md); }
	.media-card { display: flex; flex-direction: column; gap: var(--space-md); }

	.media-main { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
	.media-info { flex: 1; }
	.media-title { font-size: var(--text-lg); font-weight: 600; color: var(--text-primary); }
	.media-author { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 2px; }

	.media-status { display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-xs); }
	.media-rating { color: var(--accent-primary); letter-spacing: 2px; font-size: var(--text-sm); }
	.badge { font-size: 0.65rem; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 500; text-transform: uppercase; white-space: nowrap; }
	.badge-success { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
	.badge-active { background: color-mix(in srgb, var(--accent-primary) 15%, transparent); color: var(--accent-primary); }

	.media-progress { display: flex; align-items: center; gap: var(--space-sm); }
	.progress-bar { flex: 1; height: 6px; background: var(--bg-elevated); border-radius: var(--radius-full); overflow: hidden; }
	.progress-fill { height: 100%; background: var(--accent-primary); transition: width var(--duration-normal) var(--ease-out); }
	.progress-text { font-size: var(--text-xs); color: var(--text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }

	.media-notes { font-size: var(--text-sm); color: var(--text-secondary); padding: var(--space-sm); background: var(--bg-app); border-radius: var(--radius-md); border: 1px solid var(--bg-elevated); }

	.media-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-sm); border-top: 1px solid var(--bg-elevated); padding-top: var(--space-sm); }

	.empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-2xl); color: var(--text-muted); text-align: center; }
	.empty-icon { font-size: 2.5rem; }

	.btn-primary { background: var(--accent-primary); color: var(--text-inverse); font-weight: 600; padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); transition: all var(--duration-fast) var(--ease-out); }
	.btn-primary:hover:not(:disabled) { background: var(--accent-primary-hover); box-shadow: var(--shadow-glow); }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-ghost { padding: var(--space-sm) var(--space-md); color: var(--text-secondary); border-radius: var(--radius-md); font-weight: 500; transition: all var(--duration-fast) var(--ease-out); }
	.btn-ghost:hover { background: var(--bg-elevated); color: var(--text-primary); }
	.btn-ghost-sm { font-size: var(--text-sm); padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm); color: var(--text-secondary); transition: all var(--duration-fast) var(--ease-out); }
	.btn-ghost-sm:hover { background: var(--bg-elevated); color: var(--text-primary); }
	.btn-icon-danger { color: var(--text-muted); font-size: var(--text-sm); font-weight: 500; padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm); transition: all var(--duration-fast) var(--ease-out); }
	.btn-icon-danger:hover { background: var(--accent-secondary-muted); color: var(--color-danger); }

	@media (max-width: 768px) {
		.form-grid { grid-template-columns: 1fr; }
		.form-group.span-2 { grid-column: 1; }
	}
</style>
