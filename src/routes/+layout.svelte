<script lang="ts">
	let { children } = $props();
</script>

<div class="app-root">
	{@render children()}
</div>

<style>
	:root {
		color-scheme: light;
		--font: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		--page: #f5f7fa;
		--surface: #ffffff;
		--surface-2: #eef2f7;
		--ink: #13213a;
		--ink-2: #3a4a5f;
		--muted: #66748a;
		--hairline: #e3e8ef;
		--grid: #e8ecf2;
		--accent: #1d5fb8;
		--accent-ink: #1a4f99;
		--accent-wash: #e8f0fb;
		--navy: #0b1a30;
		--navy-2: #102a4c;
		--on-navy: #f2f6fb;
		--on-navy-2: #b9c7da;
		--good: #0a7f2e;
		--good-bg: #f0fdf4;
		--good-border: #86efac;
		--warn: #a15c00;
		--warn-bg: #fffbeb;
		--warn-border: #fde68a;
		--bad: #c0392b;
		--bad-bg: #fef2f2;
		--bad-border: #fca5a5;
		--shadow: 0 1px 3px rgba(16, 32, 56, 0.06), 0 4px 16px rgba(16, 32, 56, 0.04);
		--shadow-lg: 0 4px 20px rgba(16, 32, 56, 0.08);
		--radius: 10px;
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: var(--font);
		background: var(--page);
		color: var(--ink);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.app-root {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>
