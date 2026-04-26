<script>
	import { enhance } from '$app/forms';
	import { slide, fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { onMount } from 'svelte';

	let { data } = $props();
	let showAddForm = $state(false);
	let permissionStatus = $state('granted');

	onMount(() => {
		if ('Notification' in window) {
			permissionStatus = Notification.permission;
		}
	});

	function requestPermission() {
		if ('Notification' in window) {
			Notification.requestPermission().then(p => permissionStatus = p);
		}
	}

	let newItem = $state({
		title: '',
		message: '',
		trigger_time: '08:00',
		trigger_once: true,
		days: [1, 2, 3, 4, 5]
	});

	function formatDays(jsonStr) {
		if (jsonStr === 'once') return 'Once';
		try {
			const d = JSON.parse(jsonStr);
			const map = {1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 7:'Sun'};
			return d.map(x => map[x]).join(', ');
		} catch { return 'Invalid'; }
	}

	function resetForm() {
		newItem = { title: '', message: '', trigger_time: '08:00', trigger_once: true, days: [1, 2, 3, 4, 5] };
		showAddForm = false;
	}

	function toggleDay(d) {
		if (newItem.days.includes(d)) {
			newItem.days = newItem.days.filter(x => x !== d);
		} else {
			newItem.days = [...newItem.days, d].sort();
		}
	}
</script>

<svelte:head>
	<title>√ Notifications — Life Manager</title>
</svelte:head>

<div class="notify-page">
	<header class="page-header" in:fly={{ y: -20, duration: 400 }}>
		<h2>Notifications</h2>
		<button class="btn-primary" onclick={() => showAddForm = !showAddForm}>
			{showAddForm ? 'Cancel' : '+ New Notification'}
		</button>
	</header>

	{#if permissionStatus !== 'granted'}
		<div class="permission-banner" in:slide>
			<div class="perm-text">
				<strong>Notifications are {permissionStatus === 'denied' ? 'blocked!' : 'not enabled!'}</strong>
				<p>Your browser needs permission to show push notifications.</p>
			</div>
			<button class="btn-primary" onclick={requestPermission}>Enable Notifications</button>
		</div>
	{/if}

	{#if showAddForm}
		<form method="POST" action="?/add" class="card notify-form" transition:slide={{ duration: 200 }}
			use:enhance={() => { return async ({ update }) => { resetForm(); await update(); }; }}
		>
			<div class="form-group">
				<label>Title</label>
				<input type="text" name="title" bind:value={newItem.title} required placeholder="Time to stretch!" />
			</div>
			
			<div class="form-group">
				<label>Message</label>
				<input type="text" name="message" bind:value={newItem.message} required placeholder="Take 5 minutes to stretch your back." />
			</div>

			<div class="form-row">
				<div class="form-group">
					<label>Time</label>
					<input type="time" name="trigger_time" bind:value={newItem.trigger_time} required />
				</div>
				<div class="form-group mode-select">
					<label>Frequency</label>
					<div class="mode-toggles">
						<button type="button" class="btn-ghost-sm" class:active={newItem.trigger_once} onclick={() => newItem.trigger_once = true}>Once</button>
						<button type="button" class="btn-ghost-sm" class:active={!newItem.trigger_once} onclick={() => newItem.trigger_once = false}>Repeating</button>
					</div>
				</div>
			</div>

			{#if !newItem.trigger_once}
				<div class="form-group" transition:slide={{ duration: 150 }}>
					<label>Days of Week</label>
					<div class="days-picker">
						{#each [{i:1,l:'M'},{i:2,l:'T'},{i:3,l:'W'},{i:4,l:'T'},{i:5,l:'F'},{i:6,l:'S'},{i:7,l:'S'}] as day}
							<button type="button" class="day-btn" class:active={newItem.days.includes(day.i)} onclick={() => toggleDay(day.i)}>
								{day.l}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<input type="hidden" name="trigger_days" value={newItem.trigger_once ? 'once' : newItem.days.join(',')} />

			<div class="form-actions">
				<button type="submit" class="btn-primary" disabled={!newItem.title || !newItem.message || (!newItem.trigger_once && newItem.days.length === 0)}>Save</button>
			</div>
		</form>
	{/if}

	<div class="notify-list">
		{#if data.notifications.length === 0 && !showAddForm}
			<div class="empty-state">
				<span class="empty-icon">🔔</span>
				<p>No notifications scheduled. Create one to be reminded!</p>
				<p class="empty-sub">Keep the tab open in the background to receive them.</p>
			</div>
		{/if}

		{#each data.notifications as msg (msg.id)}
			<div class="card notify-card" class:disabled={!msg.is_active} animate:flip={{ duration: 250 }}>
				<div class="notify-main">
					<div class="notify-info">
						<h3>{msg.title}</h3>
						<p>{msg.message}</p>
						<div class="notify-meta">
							<span class="badge time-badge">🕒 {msg.trigger_time}</span>
							<span class="badge freq-badge">📅 {formatDays(msg.trigger_days)}</span>
						</div>
					</div>
					
					<div class="notify-actions">
						<form method="POST" action="?/toggle" use:enhance>
							<input type="hidden" name="id" value={msg.id} />
							<button type="submit" class="btn-ghost-sm" class:active={msg.is_active}>
								{msg.is_active ? 'Active' : 'Paused'}
							</button>
						</form>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={msg.id} />
							<button type="submit" class="btn-icon-danger">×</button>
						</form>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.notify-page { display: flex; flex-direction: column; gap: var(--space-lg); }
	.page-header { display: flex; justify-content: space-between; align-items: center; }
	.page-header h2 { font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); }

	.permission-banner { display: flex; justify-content: space-between; align-items: center; padding: var(--space-md) var(--space-lg); background: rgba(226, 184, 120, 0.15); border: 1px solid var(--color-warning); border-radius: var(--radius-md); }
	.perm-text strong { color: var(--color-warning); }
	.perm-text p { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 2px; }

	.card { background: var(--bg-surface); border: 1px solid var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-lg); }

	.notify-form { display: flex; flex-direction: column; gap: var(--space-md); }
	.form-group { display: flex; flex-direction: column; gap: var(--space-xs); }
	.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
	.form-group label { font-size: var(--text-xs); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
	
	.mode-toggles { display: flex; gap: var(--space-xs); background: var(--bg-input); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--bg-elevated); width: fit-content; }
	.btn-ghost-sm { padding: 4px 12px; font-size: var(--text-sm); border-radius: var(--radius-sm); color: var(--text-muted); cursor: pointer; transition: all var(--duration-fast); border: none; }
	.btn-ghost-sm:hover { color: var(--text-primary); }
	.btn-ghost-sm.active { background: var(--bg-elevated); color: var(--text-primary); font-weight: 500; }

	.days-picker { display: flex; gap: var(--space-xs); }
	.day-btn { width: 36px; height: 36px; border-radius: var(--radius-full); background: var(--bg-input); border: 1px solid var(--bg-elevated); color: var(--text-secondary); font-weight: 500; transition: all var(--duration-fast); }
	.day-btn:hover { border-color: var(--accent-primary); color: var(--text-primary); }
	.day-btn.active { background: var(--accent-primary); color: var(--text-inverse); border-color: var(--accent-primary); }

	.form-actions { display: flex; justify-content: flex-end; padding-top: var(--space-md); border-top: 1px solid var(--bg-elevated); margin-top: var(--space-xs); }
	
	.btn-primary { background: var(--accent-primary); color: var(--text-inverse); font-weight: 600; padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md); margin-bottom: 0px; border: none; }
	.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

	.notify-list { display: flex; flex-direction: column; gap: var(--space-md); }
	.notify-card { transition: opacity var(--duration-fast); }
	.notify-card.disabled { opacity: 0.6; }
	
	.notify-main { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); }
	.notify-info h3 { font-size: var(--text-lg); font-weight: 600; margin-bottom: 4px; }
	.notify-info p { color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-sm); }
	
	.notify-meta { display: flex; gap: var(--space-sm); }
	.badge { font-size: 0.7rem; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 500; background: var(--bg-elevated); color: var(--text-secondary); }
	
	.notify-actions { display: flex; gap: var(--space-xs); align-items: center; }
	.btn-icon-danger { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: var(--text-xl); color: var(--text-muted); border-radius: var(--radius-sm); transition: all 150ms; border: none; background: transparent; }
	.btn-icon-danger:hover { background: var(--accent-secondary-muted); color: var(--color-danger); }

	.empty-state { text-align: center; padding: var(--space-3xl) 0; color: var(--text-muted); }
	.empty-icon { font-size: 3rem; display: block; margin-bottom: var(--space-md); filter: grayscale(1); opacity: 0.3; }
	.empty-sub { font-size: var(--text-xs); margin-top: var(--space-xs); opacity: 0.7; }
</style>
