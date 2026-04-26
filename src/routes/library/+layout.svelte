<script>
	import { page } from '$app/stores';
	import { slide } from 'svelte/transition';

	const tabs = [
		{ href: '/library/book', label: 'Books', icon: '📚' },
		{ href: '/library/comic', label: 'Comics', icon: '💭' },
		{ href: '/library/movie', label: 'Movies', icon: '🎬' },
		{ href: '/library/game', label: 'Videogames', icon: '🎮' }
	];

	function isActive(href, pathname) {
		return pathname.startsWith(href);
	}

	let { children } = $props();
</script>

<div class="library-layout">
	<header class="library-header">
		<div>
			<h1>Library</h1>
			<p class="subtitle">Track your media consumption</p>
		</div>
	</header>

	<div class="library-nav">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="library-tab"
				class:active={isActive(tab.href, $page.url.pathname)}
			>
				<span class="tab-icon">{tab.icon}</span>
				{tab.label}
			</a>
		{/each}
	</div>

	<div class="library-content">
		{@render children()}
	</div>
</div>

<style>
	.library-layout { display: flex; flex-direction: column; gap: var(--space-lg); }
	.library-header h1 {
		font-size: var(--text-3xl); font-weight: 700;
		background: linear-gradient(135deg, var(--text-primary), var(--accent-primary));
		-webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
	}
	.subtitle { color: var(--text-secondary); font-size: var(--text-sm); margin-top: var(--space-xs); }

	.library-nav {
		display: flex; gap: var(--space-xs); border-bottom: 1px solid var(--bg-elevated);
		padding-bottom: var(--space-sm); overflow-x: auto;
	}

	.library-tab {
		display: flex; align-items: center; gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md); border-radius: var(--radius-md);
		font-weight: 500; font-size: var(--text-sm); color: var(--text-secondary);
		text-decoration: none; transition: all var(--duration-fast) var(--ease-out);
		white-space: nowrap;
	}
	.library-tab:hover { background: var(--bg-elevated); color: var(--text-primary); }
	.library-tab.active { background: var(--accent-primary-muted); color: var(--accent-primary); }
</style>
