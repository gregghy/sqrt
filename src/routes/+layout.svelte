<script>
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';
	import '../lib/styles/global.css';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Home', icon: '⌂' },
		{ href: '/notebook', label: 'Notebook', icon: '✎' },
		{ href: '/habits', label: 'Habits', icon: '◉' },
		{ href: '/library', label: 'Library', icon: '📚' },
		{ href: '/notifications', label: 'Notify', icon: '🔔' }
	];

	let sidebarCollapsed = $state(false);

	import { onMount } from 'svelte';

	onMount(() => {
		if ('Notification' in window && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').then(reg => {
				const checkNotify = async () => {
					try {
						const res = await fetch('/api/notifications');
						if (res.ok) {
							const data = await res.json();
							data.triggers.forEach(n => {
								if (Notification.permission === 'granted') {
									reg.showNotification(n.title, { 
										body: n.message, 
										icon: '/favicon.svg',
										badge: '/favicon.svg',
										vibrate: [200, 100, 200]
									});
								}
							});
						}
					} catch (e) {}
				};
				checkNotify(); // call immediately 
				setInterval(checkNotify, 15000); // 15 seconds
			}).catch(err => console.error("Service Worker failed:", err));
		}
	});

	function isActive(href, pathname) {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<div class="app-shell" class:sidebar-collapsed={sidebarCollapsed}>
	<!-- Desktop Sidebar -->
	<nav class="sidebar" aria-label="Main navigation">
		<div class="sidebar-top">
			<div class="sidebar-brand">
				<span class="brand-icon">√</span>
				{#if !sidebarCollapsed}
					<span class="brand-text">Life Manager</span>
				{/if}
			</div>
			<button class="collapse-btn" onclick={() => sidebarCollapsed = !sidebarCollapsed} aria-label="Toggle sidebar">
				{sidebarCollapsed ? '▸' : '◂'}
			</button>
		</div>

		<ul class="sidebar-nav">
			{#each navItems as item}
				<li>
					<a
						href={item.href}
						class="nav-link"
						class:active={isActive(item.href, $page.url.pathname)}
						title={sidebarCollapsed ? item.label : ''}
					>
						<span class="nav-icon">{item.icon}</span>
						{#if !sidebarCollapsed}
							<span class="nav-label">{item.label}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>

		{#if !sidebarCollapsed}
			<div class="sidebar-footer">
				<div class="status-indicator">
					<span class="status-dot"></span>
					<span class="status-text">Connected via Tailscale</span>
				</div>
			</div>
		{:else}
			<div class="sidebar-footer">
				<div class="status-indicator">
					<span class="status-dot"></span>
				</div>
			</div>
		{/if}
	</nav>

	<!-- Main Content -->
	<main class="main-content">
		<div class="page-container">
			{@render children()}
		</div>
	</main>



	<!-- Mobile Bottom Navigation -->
	<nav class="mobile-nav" aria-label="Mobile navigation">
		{#each navItems as item}
			<a
				href={item.href}
				class="mobile-nav-link"
				class:active={isActive(item.href, $page.url.pathname)}
			>
				<span class="mobile-nav-icon">{item.icon}</span>
				<span class="mobile-nav-label">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.app-shell { display: flex; min-height: 100dvh; }

	/* ======= Sidebar ======= */
	.sidebar {
		position: fixed; top: 0; left: 0;
		width: var(--sidebar-width); height: 100dvh;
		background: var(--bg-surface); border-right: 1px solid var(--bg-elevated);
		display: flex; flex-direction: column; padding: var(--space-md) var(--space-md);
		z-index: 100; transition: width var(--duration-normal) var(--ease-out);
	}

	.sidebar-collapsed .sidebar { width: 60px; }

	.sidebar-top {
		display: flex; align-items: center; justify-content: space-between;
		padding-bottom: var(--space-md); border-bottom: 1px solid var(--bg-elevated);
		margin-bottom: var(--space-md); gap: var(--space-sm);
	}

	.sidebar-brand { display: flex; align-items: center; gap: var(--space-sm); overflow: hidden; }

	.brand-icon {
		font-size: var(--text-xl); font-weight: 700; color: var(--accent-primary);
		width: 36px; height: 36px; min-width: 36px;
		display: flex; align-items: center; justify-content: center;
		background: var(--accent-primary-muted); border-radius: var(--radius-md);
	}

	.brand-text { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); white-space: nowrap; }

	.collapse-btn {
		width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
		border-radius: var(--radius-sm); color: var(--text-muted); font-size: var(--text-sm);
		transition: all var(--duration-fast) var(--ease-out); flex-shrink: 0;
	}
	.collapse-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }

	.sidebar-nav { list-style: none; display: flex; flex-direction: column; gap: var(--space-xs); flex: 1; }

	.nav-link {
		display: flex; align-items: center; gap: var(--space-md);
		padding: var(--space-sm) var(--space-sm); border-radius: var(--radius-md);
		color: var(--text-secondary); font-weight: 500; font-size: var(--text-sm);
		transition: all var(--duration-fast) var(--ease-out); text-decoration: none;
	}
	.nav-link:hover { background: var(--bg-elevated); color: var(--text-primary); }
	.nav-link.active { background: var(--accent-primary-muted); color: var(--accent-primary); }
	.nav-icon { font-size: var(--text-xl); width: 24px; min-width: 24px; text-align: center; }

	.sidebar-footer { padding-top: var(--space-md); border-top: 1px solid var(--bg-elevated); }
	.status-indicator { display: flex; align-items: center; gap: var(--space-sm); }
	.status-dot {
		width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--color-success);
		box-shadow: 0 0 8px rgba(139, 196, 138, 0.4); animation: pulse 3s ease-in-out infinite; flex-shrink: 0;
	}
	@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
	.status-text { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }

	/* ======= Main Content ======= */
	.main-content {
		flex: 1; margin-left: var(--sidebar-width); min-height: 100dvh; position: relative;
		transition: margin-left var(--duration-normal) var(--ease-out);
	}
	.sidebar-collapsed .main-content { margin-left: 60px; }

	.page-container { padding: var(--space-xl) var(--space-2xl); max-width: 1200px; margin: 0 auto; }

	/* ======= Mobile Bottom Nav ======= */
	.mobile-nav {
		display: none; position: fixed; bottom: 0; left: 0; right: 0; height: calc(var(--nav-height) + env(safe-area-inset-bottom));
		background: var(--bg-surface); border-top: 1px solid var(--bg-elevated); z-index: 100;
		padding-bottom: env(safe-area-inset-bottom);
		backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
	}
	.mobile-nav-link {
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
		color: var(--text-muted); text-decoration: none; transition: color var(--duration-fast) var(--ease-out);
	}
	.mobile-nav-link.active { color: var(--accent-primary); }
	.mobile-nav-icon { font-size: 1.4rem; }
	.mobile-nav-label { font-size: 0.65rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

	/* ======= Responsive ======= */
	@media (max-width: 768px) {
		.sidebar { display: none; }
		.main-content { margin-left: 0 !important; padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom)); }
		.page-container { padding: var(--space-md) var(--space-md); overflow-x: hidden; }
		.mobile-nav { display: flex; justify-content: space-around; align-items: center; }
	}
</style>
