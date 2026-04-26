<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fly, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	let { data } = $props();

	let showAddHabit = $state(false);
	let newHabit = $state({ name: '', icon: '◉', color: '#D4A373' });

	const viewOptions = [
		{ value: 'week', label: 'Week' },
		{ value: 'month', label: 'Month' },
		{ value: 'year', label: 'Year' },
		{ value: 'all', label: 'All Time' }
	];

	const todayChecklist = $derived(
		data.habits.map(h => ({
			...h,
			done: data.logMap[h.id]?.includes(data.today) ?? false
		}))
	);

	function getStreak(habitId) {
		const logs = data.logMap[habitId] || [];
		const sorted = [...logs].sort().reverse();
		let streak = 0;
		const today = new Date(data.today);
		for (let i = 0; i <= sorted.length; i++) {
			const expected = new Date(today);
			expected.setDate(expected.getDate() - i);
			const expectedStr = expected.toISOString().split('T')[0];
			if (sorted.includes(expectedStr)) {
				streak++;
			} else {
				break;
			}
		}
		return streak;
	}

	function getCompletionRate(habitId) {
		const logs = data.logMap[habitId] || [];
		const total = data.dateGrid.length;
		return total > 0 ? Math.round((logs.length / total) * 100) : 0;
	}

	function switchView(view) {
		goto(`/habits?view=${view}`);
	}

	function formatDayShort(dateStr) {
		return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
	}

	function formatDate(dateStr) {
		return new Date(dateStr + 'T12:00:00').getDate();
	}

	function formatMonth(dateStr) {
		return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' });
	}

	function isLogged(habitId, date) {
		return data.logMap[habitId]?.includes(date) ?? false;
	}

	function resetForm() {
		newHabit = { name: '', icon: '◉', color: '#D4A373' };
		showAddHabit = false;
	}

	const iconOptions = ['◉', '🏃', '📚', '💧', '🧘', '💪', '🎯', '✍️', '🛌', '🥗', '💊', '🧹', '🎸', '🧠'];

	// For compact views (month/year/all), show cells as a heatmap grid
	const isCompact = $derived(data.view === 'month' || data.view === 'year' || data.view === 'all');

	// Group dates by week for compact grid
	const weekGroups = $derived(() => {
		const weeks = [];
		let currentWeek = [];
		for (const date of data.dateGrid) {
			currentWeek.push(date);
			const dow = new Date(date + 'T12:00:00').getDay();
			if (dow === 0 || date === data.dateGrid[data.dateGrid.length - 1]) {
				weeks.push(currentWeek);
				currentWeek = [];
			}
		}
		return weeks;
	});
</script>

<svelte:head>
	<title>√ Habits — Life Manager</title>
</svelte:head>

<div class="habits-page">
	<header class="page-header" in:fly={{ y: -20, duration: 400 }}>
		<div>
			<h1>Habit Tracker</h1>
			<p class="subtitle">Build consistency, one day at a time</p>
		</div>
		<button class="btn-primary" onclick={() => showAddHabit = !showAddHabit}>
			{showAddHabit ? 'Cancel' : '+ New Habit'}
		</button>
	</header>

	<!-- Add Habit Form -->
	{#if showAddHabit}
		<form method="POST" action="?/addHabit" class="card add-habit-form" transition:slide={{ duration: 200 }}
			use:enhance={() => { return async ({ update }) => { resetForm(); await update(); }; }}
		>
			<div class="form-row">
				<input type="text" name="name" bind:value={newHabit.name} placeholder="Habit name" required />
				<input type="hidden" name="icon" value={newHabit.icon} />
				<input type="color" name="color" bind:value={newHabit.color} class="color-picker" />
				<button type="submit" class="btn-primary" disabled={!newHabit.name.trim()}>Add</button>
			</div>
			<div class="icon-picker">
				{#each iconOptions as icon}
					<button type="button" class="icon-option" class:selected={newHabit.icon === icon} onclick={() => newHabit.icon = icon}>{icon}</button>
				{/each}
			</div>
		</form>
	{/if}

	<!-- Today's Checklist -->
	<section class="card today-section" in:fly={{ y: 20, duration: 400, delay: 100 }}>
		<h2 class="section-title">Today</h2>
		<div class="checklist">
			{#each todayChecklist as habit (habit.id)}
				<div class="habit-check-row" class:done={habit.done} animate:flip={{ duration: 250 }}>
					<form method="POST" action="?/toggleHabit" use:enhance>
						<input type="hidden" name="habitId" value={habit.id} />
						<input type="hidden" name="date" value={data.today} />
						<button type="submit" class="habit-toggle" style="--h-color: {habit.color}">
							<span class="habit-icon">{habit.icon}</span>
							<span class="habit-name">{habit.name}</span>
							<span class="streak-badge">{getStreak(habit.id)}🔥</span>
							<span class="check-indicator" class:checked={habit.done}>
								{#if habit.done}✓{/if}
							</span>
						</button>
					</form>
					<form method="POST" action="?/deleteHabit" use:enhance>
						<input type="hidden" name="id" value={habit.id} />
						<button type="submit" class="btn-icon-danger" aria-label="Delete habit">×</button>
					</form>
				</div>
			{/each}
			{#if data.habits.length === 0}
				<div class="empty-state">
					<span class="empty-icon">📋</span>
					<p>No habits yet. Create one to start tracking!</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Timeline Matrix -->
	{#if data.habits.length > 0}
		<section class="card matrix-section" in:fly={{ y: 20, duration: 400, delay: 200 }}>
			<div class="matrix-header-bar">
				<h2 class="section-title">Timeline</h2>
				<div class="view-tabs">
					{#each viewOptions as opt}
						<button
							class="view-tab"
							class:active={data.view === opt.value}
							onclick={() => switchView(opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			{#if !isCompact}
				<!-- Week view: detailed table -->
				<div class="matrix">
					<div class="matrix-row matrix-header-row">
						<div class="matrix-label"></div>
						{#each data.dateGrid as date}
							<div class="matrix-day" class:today={date === data.today}>
								<span class="day-name">{formatDayShort(date)}</span>
								<span class="day-num">{formatDate(date)}</span>
							</div>
						{/each}
					</div>
					{#each data.habits as habit (habit.id)}
						<div class="matrix-row">
							<div class="matrix-label">
								<span>{habit.icon}</span>
								<span class="matrix-habit-name">{habit.name}</span>
							</div>
							{#each data.dateGrid as date}
								<form method="POST" action="?/toggleHabit" use:enhance class="matrix-cell-form">
									<input type="hidden" name="habitId" value={habit.id} />
									<input type="hidden" name="date" value={date} />
									<button type="submit" class="matrix-cell" class:filled={isLogged(habit.id, date)} class:today={date === data.today} style="--h-color: {habit.color}" aria-label="{habit.name} on {date}"></button>
								</form>
							{/each}
						</div>
					{/each}
				</div>
			{:else}
				<!-- Compact heatmap for month/year/all -->
				{#each data.habits as habit (habit.id)}
					<div class="heatmap-section">
						<div class="heatmap-header">
							<span class="heatmap-label">{habit.icon} {habit.name}</span>
							<span class="heatmap-rate">{getCompletionRate(habit.id)}% completion</span>
						</div>
						<div class="heatmap-grid">
							{#each data.dateGrid as date}
								<form method="POST" action="?/toggleHabit" use:enhance class="heatmap-form">
									<input type="hidden" name="habitId" value={habit.id} />
									<input type="hidden" name="date" value={date} />
									<button
										type="submit"
										class="heatmap-cell"
										class:filled={isLogged(habit.id, date)}
										class:today={date === data.today}
										style="--h-color: {habit.color}"
										title="{date}"
									></button>
								</form>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</section>
	{/if}
</div>

<style>
	.habits-page { display: flex; flex-direction: column; gap: var(--space-lg); max-width: 100%; overflow-x: hidden; }

	.page-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-sm); }
	.page-header h1 {
		font-size: var(--text-3xl); font-weight: 700;
		background: linear-gradient(135deg, var(--text-primary), var(--accent-primary));
		-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
	}
	.subtitle { color: var(--text-secondary); font-size: var(--text-sm); margin-top: var(--space-xs); }
	.section-title { font-size: var(--text-lg); font-weight: 600; }
	.card { background: var(--bg-surface); border: 1px solid var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-lg); max-width: 100%; overflow-x: auto; }


	.add-habit-form { display: flex; flex-direction: column; gap: var(--space-md); }
	.form-row { display: flex; gap: var(--space-sm); }
	.form-row input[type="text"] { flex: 1; }
	.color-picker { width: 42px; height: 42px; padding: 4px; border-radius: var(--radius-md); cursor: pointer; border: 1px solid var(--bg-elevated); background: var(--bg-input); }
	.icon-picker { display: flex; gap: var(--space-xs); flex-wrap: wrap; }
	.icon-option { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); font-size: var(--text-lg); transition: all var(--duration-fast) var(--ease-out); background: var(--bg-app); }
	.icon-option:hover { background: var(--bg-elevated); transform: scale(1.1); }
	.icon-option.selected { background: var(--accent-primary-muted); box-shadow: 0 0 0 2px var(--accent-primary); }

	/* Today */
	.today-section .section-title { margin-bottom: var(--space-md); }
	.checklist { display: flex; flex-direction: column; gap: var(--space-xs); }
	.habit-check-row { display: flex; align-items: center; gap: var(--space-xs); }
	.habit-toggle { flex: 1; display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); transition: all var(--duration-fast) var(--ease-out); width: 100%; flex-wrap: wrap; }
	.habit-toggle:hover { background: var(--bg-elevated); }
	.habit-icon { font-size: var(--text-xl); flex-shrink: 0; }
	.habit-name { flex: 1 1 100px; text-align: left; font-weight: 500; font-size: var(--text-sm); white-space: normal; line-height: 1.2; }
	.streak-badge { font-size: var(--text-xs); color: var(--text-muted); background: var(--bg-app); padding: 2px 8px; border-radius: var(--radius-full); }
	.check-indicator { width: 24px; height: 24px; border-radius: var(--radius-full); border: 2px solid var(--text-muted); display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all var(--duration-fast) var(--ease-spring); flex-shrink: 0; }
	.check-indicator.checked { border-color: var(--h-color, var(--accent-primary)); background: var(--h-color, var(--accent-primary)); color: var(--text-inverse); }
	.habit-check-row.done .habit-name { color: var(--text-muted); }
	.empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); padding: var(--space-2xl); color: var(--text-muted); text-align: center; }
	.empty-icon { font-size: 2rem; }

	/* View tabs */
	.matrix-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md); flex-wrap: wrap; gap: var(--space-sm); }
	.view-tabs { display: flex; gap: 2px; background: var(--bg-app); border-radius: var(--radius-md); padding: 2px; }
	.view-tab { padding: var(--space-xs) var(--space-md); border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 500; color: var(--text-secondary); transition: all var(--duration-fast) var(--ease-out); }
	.view-tab:hover { color: var(--text-primary); }
	.view-tab.active { background: var(--accent-primary-muted); color: var(--accent-primary); }

	/* Week matrix (detailed) */
	.matrix { display: flex; flex-direction: column; gap: var(--space-xs); overflow-x: auto; }
	.matrix-row, .matrix-header-row { display: flex; align-items: center; gap: var(--space-xs); }
	.matrix-label { width: 140px; min-width: 140px; display: flex; align-items: center; gap: var(--space-sm); font-size: var(--text-sm); }
	.matrix-habit-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.matrix-day { width: 48px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.matrix-day.today { color: var(--accent-primary); }
	.day-name { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
	.matrix-day.today .day-name { color: var(--accent-primary); }
	.day-num { font-size: var(--text-sm); font-weight: 600; }
	.matrix-cell-form { display: contents; }
	.matrix-cell { width: 48px; height: 40px; border-radius: var(--radius-sm); background: var(--bg-app); border: 1px solid var(--bg-elevated); transition: all var(--duration-fast) var(--ease-out); cursor: pointer; }
	.matrix-cell:hover { border-color: var(--h-color, var(--accent-primary)); transform: scale(1.05); }
	.matrix-cell.filled { background: var(--h-color, var(--accent-primary)); border-color: var(--h-color, var(--accent-primary)); box-shadow: 0 0 8px color-mix(in srgb, var(--h-color, var(--accent-primary)) 30%, transparent); }
	.matrix-cell.today { border-color: var(--accent-primary); border-width: 2px; }

	/* Heatmap (month/year/all) */
	.heatmap-section { margin-bottom: var(--space-lg); }
	.heatmap-section:last-child { margin-bottom: 0; }
	.heatmap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm); }
	.heatmap-label { font-size: var(--text-sm); font-weight: 500; }
	.heatmap-rate { font-size: var(--text-xs); color: var(--text-muted); }
	.heatmap-grid { display: flex; flex-wrap: wrap; gap: 3px; }
	.heatmap-form { display: contents; }
	.heatmap-cell {
		width: 14px; height: 14px; border-radius: 2px;
		background: var(--bg-app); border: 1px solid var(--bg-elevated);
		transition: all var(--duration-fast) var(--ease-out); cursor: pointer;
	}
	.heatmap-cell:hover { border-color: var(--h-color, var(--accent-primary)); transform: scale(1.3); }
	.heatmap-cell.filled { background: var(--h-color, var(--accent-primary)); border-color: var(--h-color, var(--accent-primary)); }
	.heatmap-cell.today { border-color: var(--accent-primary); border-width: 2px; }

	/* Buttons */
	.btn-primary { background: var(--accent-primary); color: var(--text-inverse); font-weight: 600; padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); transition: all var(--duration-fast) var(--ease-out); }
	.btn-primary:hover:not(:disabled) { background: var(--accent-primary-hover); box-shadow: var(--shadow-glow); }
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-icon-danger { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--text-muted); font-size: var(--text-lg); transition: all var(--duration-fast) var(--ease-out); }
	.btn-icon-danger:hover { background: var(--accent-secondary-muted); color: var(--color-danger); }

	@media (max-width: 768px) {
		.page-header { flex-direction: column; align-items: stretch; gap: var(--space-md); }
		.page-header h1 { font-size: var(--text-2xl); }
		.matrix-label { width: 100px; min-width: 100px; }
		.matrix-cell, .matrix-day { width: 38px; }
		.matrix-cell { height: 32px; }
		.heatmap-cell { width: 12px; height: 12px; }
	}
</style>
