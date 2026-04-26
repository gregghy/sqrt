<script>
	import { enhance } from '$app/forms';
	import { fly, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	let { data } = $props();

	let newTodoText = $state('');
	let newTodoGoal = $state('');
	let showGoalForm = $state(false);
	let newGoal = $state({ title: '', color: '#D4A373' });

	let mediaView = $state('week');
	let challengeEdit = $state(false);
	let newChallengeTarget = $state();

	$effect(() => {
		if (data.challenge && newChallengeTarget === undefined) {
			newChallengeTarget = data.challenge.target_pages;
		}
	});

	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

	const completedTodos = $derived(data.todos.filter(t => t.completed).length);
	const totalTodos = $derived(data.todos.length);
	const activeTodos = $derived(data.todos.filter(t => !t.completed));
	const doneTodos = $derived(data.todos.filter(t => t.completed));
	const activeGoals = $derived(data.goals.filter(g => !g.completed));

	function resetGoalForm() {
		newGoal = { title: '', color: '#D4A373' };
		showGoalForm = false;
	}
</script>

<svelte:head>
	<title>√ Home — Life Manager</title>
</svelte:head>

<div class="dashboard">
	<header class="dash-header" in:fly={{ y: -20, duration: 400 }}>
		<div>
			<h1 class="greeting">{greeting}</h1>
			<p class="date-display">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
		</div>
	</header>

	<!-- Stats Strip -->
	<div class="stats-strip" in:fly={{ y: 20, duration: 400, delay: 100 }}>
		<div class="stat-card">
			<span class="stat-value">{activeTodos.length}</span>
			<span class="stat-label">Active Tasks</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">{completedTodos}</span>
			<span class="stat-label">Completed</span>
		</div>
		<div class="stat-card">
			<span class="stat-value">{activeGoals.length}</span>
			<span class="stat-label">Active Goals</span>
		</div>
		<div class="stat-card accent">
			<span class="stat-value">{totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0}%</span>
			<span class="stat-label">Completion</span>
		</div>
	</div>

	<div class="dash-grid">
		<!-- ======================== TASKS ======================== -->
		<section class="card todo-section" in:fly={{ x: -20, duration: 400, delay: 200 }}>
			<div class="card-header">
				<h2>Tasks</h2>
				{#if doneTodos.length > 0}
					<form method="POST" action="?/clearCompleted" use:enhance>
						<button class="btn-ghost" type="submit">Clear done</button>
					</form>
				{/if}
			</div>

			<form method="POST" action="?/addTodo" use:enhance={() => {
				return async ({ update }) => {
					newTodoText = '';
					newTodoGoal = '';
					await update();
				};
			}}>
				<div class="todo-input-wrap">
					<input type="text" name="text" bind:value={newTodoText} placeholder="What needs to be done?" autocomplete="off" />
					<select name="goal_id" bind:value={newTodoGoal} class="goal-select">
						<option value="">No goal</option>
						{#each data.goals.filter(g => !g.completed) as goal}
							<option value={goal.id}>{goal.title}</option>
						{/each}
					</select>
					<button type="submit" class="btn-primary btn-sm" disabled={!newTodoText.trim()}>Add</button>
				</div>
			</form>

			<ul class="todo-list">
				{#each data.todos as todo (todo.id)}
					<li class="todo-item" class:done={todo.completed} animate:flip={{ duration: 250 }} transition:slide={{ duration: 200 }}>
						<form method="POST" action="?/toggleTodo" use:enhance>
							<input type="hidden" name="id" value={todo.id} />
							<button type="submit" class="todo-check" aria-label="Toggle todo">
								<span class="check-circle" class:checked={todo.completed}>
									{#if todo.completed}✓{/if}
								</span>
							</button>
						</form>
						<div class="todo-info">
							<span class="todo-text">{todo.text}</span>
							{#if todo.goal_title}
								<span class="todo-goal-badge" style="--badge-color: {todo.goal_color || 'var(--accent-primary)'}">
									{todo.goal_title}
								</span>
							{/if}
						</div>
						<form method="POST" action="?/deleteTodo" use:enhance>
							<input type="hidden" name="id" value={todo.id} />
							<button type="submit" class="btn-icon-danger" aria-label="Delete todo">×</button>
						</form>
					</li>
				{/each}
				{#if data.todos.length === 0}
					<li class="todo-empty">
						<span class="empty-icon">✨</span>
						<p>All clear! Add a task to get started.</p>
					</li>
				{/if}
			</ul>
		</section>

		<!-- ======================== GOALS ======================== -->
		<section class="card goals-section" in:fly={{ x: 20, duration: 400, delay: 200 }}>
			<div class="card-header">
				<h2>Goals</h2>
				<button class="btn-ghost" onclick={() => showGoalForm = !showGoalForm}>
					{showGoalForm ? 'Cancel' : '+ Add'}
				</button>
			</div>

			{#if showGoalForm}
				<form class="goal-form" method="POST" action="?/addGoal" transition:slide={{ duration: 200 }}
					use:enhance={() => {
						return async ({ update }) => { resetGoalForm(); await update(); };
					}}
				>
					<div class="goal-form-row">
						<input type="text" name="title" bind:value={newGoal.title} placeholder="Goal name" required />
						<input type="color" name="color" bind:value={newGoal.color} class="color-picker" />
						<button type="submit" class="btn-primary btn-sm" disabled={!newGoal.title.trim()}>Create</button>
					</div>
				</form>
			{/if}

			<div class="goals-list">
				{#each data.goals as goal (goal.id)}
					<div class="goal-card" class:done={goal.completed} animate:flip={{ duration: 250 }} transition:slide={{ duration: 200 }}>
						<form method="POST" action="?/toggleGoal" use:enhance class="goal-toggle-form">
							<input type="hidden" name="id" value={goal.id} />
							<button type="submit" class="goal-toggle-btn" aria-label="Toggle goal">
								<span class="check-circle" class:checked={goal.completed} style="border-color: {goal.color}; {goal.completed ? `background: ${goal.color}` : ''}">
									{#if goal.completed}✓{/if}
								</span>
							</button>
						</form>
						<div class="goal-info">
							<span class="goal-title" style="--g-color: {goal.color}">{goal.title}</span>
							{#if goal.taskTotal > 0}
								<span class="goal-task-count">{goal.taskDone}/{goal.taskTotal} tasks</span>
							{:else}
								<span class="goal-task-count">No tasks</span>
							{/if}
						</div>
						{#if goal.taskTotal > 0}
							<div class="goal-mini-bar">
								<div class="goal-mini-fill" style="width: {(goal.taskDone / goal.taskTotal) * 100}%; background: {goal.color};"></div>
							</div>
						{/if}
						<form method="POST" action="?/deleteGoal" use:enhance>
							<input type="hidden" name="id" value={goal.id} />
							<button type="submit" class="btn-icon-danger" aria-label="Delete goal">×</button>
						</form>
					</div>
				{/each}

				{#if data.goals.length === 0 && !showGoalForm}
					<div class="todo-empty">
						<span class="empty-icon">🎯</span>
						<p>Create a goal and assign tasks to it.</p>
					</div>
				{/if}
			</div>
		</section>

		<!-- ======================== READING CHALLENGE ======================== -->
		<section class="card challenge-section" in:fly={{ y: 20, duration: 400, delay: 300 }}>
			<div class="card-header">
				<h2>{new Date().getFullYear()} Reading Challenge</h2>
				<button class="btn-ghost" onclick={() => { challengeEdit = !challengeEdit; newChallengeTarget = data.challenge.target_pages; }}>
					{challengeEdit ? 'Cancel' : 'Edit Goal'}
				</button>
			</div>

			{#if challengeEdit}
				<form class="goal-form" method="POST" action="?/updateChallenge" transition:slide={{ duration: 200 }}
					use:enhance={() => {
						return async ({ update }) => { challengeEdit = false; await update(); };
					}}
				>
					<input type="hidden" name="year" value={data.challenge.year} />
					<div class="goal-form-row">
						<input type="number" name="target" bind:value={newChallengeTarget} placeholder="Target pages" required />
						<button type="submit" class="btn-primary btn-sm">Save</button>
					</div>
				</form>
			{/if}

			<div class="challenge-content">
				<div class="challenge-stats">
					<span class="pages-read">{data.challenge.current_pages}</span>
					<span class="pages-target">/ {data.challenge.target_pages} pages</span>
				</div>
				<div class="challenge-bar-bg">
					<div class="challenge-bar-fill" style="width: {Math.min(100, (data.challenge.current_pages / data.challenge.target_pages) * 100)}%;"></div>
				</div>
				<p class="challenge-subtitle">Books & Comics combined</p>
			</div>
		</section>

		<!-- ======================== MEDIA STATS ======================== -->
		<section class="card media-stats-section" in:fly={{ y: 20, duration: 400, delay: 400 }}>
			<div class="card-header">
				<h2>Media Consumed</h2>
				<select class="media-view-select" bind:value={mediaView}>
					<option value="week">This Week</option>
					<option value="month">This Month</option>
					<option value="year">This Year</option>
					<option value="all">All Time</option>
				</select>
			</div>

			<div class="media-stats-grid">
				<div class="media-stat-item">
					<span class="ms-icon">📚</span>
					<span class="ms-count">{data.mediaStats[mediaView].book}</span>
					<span class="ms-label">Books</span>
				</div>
				<div class="media-stat-item">
					<span class="ms-icon">💭</span>
					<span class="ms-count">{data.mediaStats[mediaView].comic}</span>
					<span class="ms-label">Comics</span>
				</div>
				<div class="media-stat-item">
					<span class="ms-icon">🎬</span>
					<span class="ms-count">{data.mediaStats[mediaView].movie}</span>
					<span class="ms-label">Movies</span>
				</div>
				<div class="media-stat-item">
					<span class="ms-icon">🎮</span>
					<span class="ms-count">{data.mediaStats[mediaView].game}</span>
					<span class="ms-label">Games</span>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.dashboard { display: flex; flex-direction: column; gap: var(--space-lg); }

	.dash-header { display: flex; justify-content: space-between; align-items: flex-end; }

	.greeting {
		font-size: var(--text-3xl); font-weight: 700; letter-spacing: -0.5px;
		background: linear-gradient(135deg, var(--text-primary), var(--accent-primary));
		-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
	}
	.date-display { font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-xs); }

	.stats-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); }
	.stat-card {
		background: var(--bg-surface); border: 1px solid var(--bg-elevated); border-radius: var(--radius-lg);
		padding: var(--space-md) var(--space-lg); display: flex; flex-direction: column; gap: var(--space-xs);
		transition: transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
	}
	.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
	.stat-card.accent { background: var(--accent-primary-muted); border-color: var(--accent-primary); }
	.stat-value { font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); }
	.stat-card.accent .stat-value { color: var(--accent-primary); }
	.stat-label { font-size: var(--text-xs); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }

	.card { background: var(--bg-surface); border: 1px solid var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-lg); }
	.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); }
	.card-header h2 { font-size: var(--text-lg); font-weight: 600; }
	.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }

	/* Buttons */
	.btn-primary { background: var(--accent-primary); color: var(--text-inverse); font-weight: 600; padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); transition: all var(--duration-fast) var(--ease-out); }
	.btn-primary:hover:not(:disabled) { background: var(--accent-primary-hover); box-shadow: var(--shadow-glow); }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-sm { padding: var(--space-xs) var(--space-sm); font-size: var(--text-sm); }
	.btn-ghost { color: var(--accent-primary); font-weight: 500; font-size: var(--text-sm); padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm); transition: background var(--duration-fast) var(--ease-out); }
	.btn-ghost:hover { background: var(--accent-primary-muted); }
	.btn-icon-danger { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--text-muted); font-size: var(--text-lg); transition: all var(--duration-fast) var(--ease-out); }
	.btn-icon-danger:hover { background: var(--accent-secondary-muted); color: var(--color-danger); }

	/* Todos */
	.todo-input-wrap { display: flex; gap: var(--space-sm); margin-bottom: var(--space-md); }
	.todo-input-wrap input { flex: 1; }
	.goal-select { flex: 0 0 auto; min-width: 100px; max-width: 160px; font-size: var(--text-sm); padding: var(--space-sm); }
	.todo-list { list-style: none; display: flex; flex-direction: column; gap: var(--space-xs); }
	.todo-item { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm); border-radius: var(--radius-md); transition: background var(--duration-fast) var(--ease-out); }
	.todo-item:hover { background: var(--bg-elevated); }
	.todo-check { flex-shrink: 0; }
	.check-circle { width: 22px; height: 22px; border-radius: var(--radius-full); border: 2px solid var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all var(--duration-fast) var(--ease-spring); color: transparent; }
	.check-circle.checked { border-color: var(--accent-primary); background: var(--accent-primary); color: var(--text-inverse); }
	.check-circle:hover { border-color: var(--accent-primary); transform: scale(1.1); }
	.todo-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.todo-text { font-size: var(--text-sm); }
	.todo-item.done .todo-text { text-decoration: line-through; color: var(--text-muted); }
	.todo-goal-badge { font-size: 0.65rem; color: var(--badge-color); background: color-mix(in srgb, var(--badge-color) 15%, transparent); padding: 1px 8px; border-radius: var(--radius-full); width: fit-content; font-weight: 500; }
	.todo-empty { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); padding: var(--space-2xl); color: var(--text-muted); text-align: center; }
	.empty-icon { font-size: 2rem; }

	/* Goals */
	.goal-form { margin-bottom: var(--space-md); padding-bottom: var(--space-md); border-bottom: 1px solid var(--bg-elevated); }
	.goal-form-row { display: flex; gap: var(--space-sm); }
	.goal-form-row input[type="text"] { flex: 1; }
	.color-picker { width: 42px; height: 42px; padding: 4px; border-radius: var(--radius-md); cursor: pointer; border: 1px solid var(--bg-elevated); background: var(--bg-input); }
	.goals-list { display: flex; flex-direction: column; gap: var(--space-sm); }
	.goal-card { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); background: var(--bg-app); border-radius: var(--radius-md); border: 1px solid var(--bg-elevated); }
	.goal-card.done { opacity: 0.5; }
	.goal-toggle-form { flex-shrink: 0; }
	.goal-toggle-btn { flex-shrink: 0; }
	.goal-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.goal-title { font-weight: 600; font-size: var(--text-sm); color: var(--g-color); }
	.goal-task-count { font-size: var(--text-xs); color: var(--text-muted); }
	.goal-mini-bar { width: 60px; height: 4px; background: var(--bg-elevated); border-radius: var(--radius-full); overflow: hidden; flex-shrink: 0; }
	.goal-mini-fill { height: 100%; border-radius: var(--radius-full); transition: width var(--duration-slow) var(--ease-out); }

	/* Reading Challenge */
	.challenge-content { display: flex; flex-direction: column; gap: var(--space-sm); margin-top: var(--space-sm); }
	.challenge-stats { display: flex; align-items: baseline; justify-content: center; gap: var(--space-xs); font-variant-numeric: tabular-nums; }
	.pages-read { font-size: 2.5rem; font-weight: 700; color: var(--accent-primary); letter-spacing: -1px; }
	.pages-target { font-size: var(--text-sm); color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
	.challenge-bar-bg { width: 100%; height: 8px; background: var(--bg-elevated); border-radius: var(--radius-full); overflow: hidden; }
	.challenge-bar-fill { height: 100%; background: linear-gradient(90deg, var(--text-primary), var(--accent-primary)); border-radius: var(--radius-full); transition: width 1s var(--ease-out); }
	.challenge-subtitle { text-align: center; font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

	/* Media Stats */
	.media-view-select { background: var(--bg-app); border: 1px solid var(--bg-elevated); color: var(--text-primary); border-radius: var(--radius-sm); padding: 4px 8px; font-size: var(--text-sm); }
	.media-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); align-items: stretch; margin-top: var(--space-sm); }
	.media-stat-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-xs); padding: var(--space-md); background: var(--bg-app); border: 1px solid var(--bg-elevated); border-radius: var(--radius-md); transition: transform var(--duration-fast); }
	.media-stat-item:hover { transform: translateY(-2px); border-color: var(--accent-primary-muted); }
	.ms-icon { font-size: 1.5rem; filter: sepia(0.5); }
	.ms-count { font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; line-height: 1; }
	.ms-label { font-size: var(--text-xs); color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

	@media (max-width: 768px) {
		.stats-strip { grid-template-columns: repeat(2, 1fr); }
		.dash-grid { grid-template-columns: 1fr; }
		.greeting { font-size: var(--text-2xl); }
		.todo-input-wrap { flex-wrap: wrap; }
		.goal-select { min-width: 100%; }
	}
</style>
