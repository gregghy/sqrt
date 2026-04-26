<script>
	import { onMount, onDestroy } from 'svelte';
	import { slide, fly } from 'svelte/transition';

	let sys = $state(null);
	let error = $state(null);
	let interval;

	const fetchData = async () => {
		try {
			const res = await fetch('/api/system');
			if (res.ok) {
				sys = await res.json();
				error = null;
			} else {
				error = "Error fetching metrics.";
			}
		} catch (e) {
			error = "Connection lost.";
		}
	};

	onMount(() => {
		fetchData();
		interval = setInterval(fetchData, 3000); // Refresh every 3s
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});
</script>

<svelte:head>
	<title>√ Server — Life Manager</title>
</svelte:head>

<div class="dashboard-page" in:fly={{ y: -20, duration: 400 }}>
	<header class="page-header">
		<h2>Server Metrics</h2>
		<span class="status-indicator" class:offline={error}>
			<span class="dot"></span> {error ? 'Offline' : 'Real-time'}
		</span>
	</header>

	{#if error}
		<div class="error-banner card">{error}</div>
	{/if}

	{#if sys}
		<div class="metrics-grid">
			<!-- OS & Uptime -->
			<div class="card metric-card full-span">
				<div class="metric-header">System</div>
				<div class="metric-value">{sys.os.distro}</div>
				<div class="metric-sub">Uptime: {sys.os.uptime} hours</div>
			</div>

			<!-- CPU Load -->
			<div class="card metric-card">
				<div class="metric-header">CPU Load</div>
				<div class="metric-value">{sys.cpu.load}%</div>
				<div class="metric-sub">{sys.cpu.brand} ({sys.cpu.cores} Cores)</div>
				<div class="progress-bar"><div class="fill" style="width: {sys.cpu.load}%" class:danger={sys.cpu.load > 85}></div></div>
			</div>

			<!-- Memory -->
			<div class="card metric-card">
				<div class="metric-header">RAM Allocation</div>
				<div class="metric-value">{sys.memory.percent}%</div>
				<div class="metric-sub">{sys.memory.used} GB / {sys.memory.total} GB</div>
				<div class="progress-bar"><div class="fill warning" style="width: {sys.memory.percent}%" class:danger={sys.memory.percent > 85}></div></div>
			</div>

			<!-- Network -->
			{#if sys.network}
				<div class="card metric-card">
					<div class="metric-header">Network Speed (eth0)</div>
					<div class="network-stats">
						<div class="stat"><span style="color:var(--color-success)">↓</span> {sys.network.rx_sec} MB/s</div>
						<div class="stat"><span style="color:var(--color-warning)">↑</span> {sys.network.tx_sec} MB/s</div>
					</div>
				</div>
			{/if}

			<!-- Disks -->
			{#each sys.storage as disk}
				{#if disk.percent > 0 && disk.mount.includes('/')}
					<div class="card metric-card disk-card">
						<div class="metric-header">Storage ({disk.mount})</div>
						<div class="metric-value">{disk.percent}%</div>
						<div class="metric-sub">{disk.used} GB / {disk.size} GB</div>
						<div class="progress-bar"><div class="fill text-brand" style="width: {disk.percent}%" class:danger={disk.percent > 90}></div></div>
					</div>
				{/if}
			{/each}
		</div>
	{:else if !error}
		<div class="card loading-state">
			Analyzing Hardware Sensors...
		</div>
	{/if}
</div>

<style>
	.dashboard-page { display: flex; flex-direction: column; gap: var(--space-xl); margin-bottom: 80px; }
	.page-header { display: flex; justify-content: space-between; align-items: center; }
	.page-header h2 { font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); }
	
	.status-indicator { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); color: var(--color-success); font-weight: 500; }
	.status-indicator .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-success); box-shadow: 0 0 8px var(--color-success); animation: pulse 2s infinite; }
	.status-indicator.offline { color: var(--color-danger); }
	.status-indicator.offline .dot { background: var(--color-danger); box-shadow: 0 0 8px var(--color-danger); animation: none; }
	@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

	.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-md); }
	.full-span { grid-column: 1 / -1; }

	.card { background: var(--bg-surface); border: 1px solid var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-lg); }
	
	.metric-header { font-size: var(--text-xs); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: var(--space-sm); }
	.metric-value { font-size: var(--text-3xl); font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
	.metric-sub { font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-md); }

	.network-stats { display: flex; flex-direction: column; gap: var(--space-sm); font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-sm); }

	.progress-bar { height: 6px; background: var(--bg-elevated); border-radius: var(--radius-full); overflow: hidden; }
	.progress-bar .fill { height: 100%; background: var(--color-success); transition: width 0.5s var(--ease-out); }
	.progress-bar .fill.warning { background: var(--color-warning); }
	.progress-bar .fill.text-brand { background: var(--text-brand); }
	.progress-bar .fill.danger { background: var(--color-danger); }

	.loading-state { text-align: center; color: var(--text-muted); font-size: var(--text-lg); font-weight: 500; padding: var(--space-3xl) 0; }
	
	@media (max-width: 768px) {
		.metrics-grid { grid-template-columns: 1fr; }
	}
</style>
