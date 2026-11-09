<script lang="ts">
	import { onMount } from 'svelte';
	import { INSTALL_HINT_DISMISSED_KEY, iosInstallTarget, isStandalone, type IosBrowser } from '../installHint';

	let target = $state<IosBrowser | null>(null);

	onMount(() => {
		try {
			if (localStorage.getItem(INSTALL_HINT_DISMISSED_KEY) === '1') return;
		} catch { /* storage unavailable: still show the hint */ }
		target = iosInstallTarget(navigator.userAgent, navigator.maxTouchPoints || 0, isStandalone(window));
	});

	function dismiss() {
		target = null;
		try { localStorage.setItem(INSTALL_HINT_DISMISSED_KEY, '1'); } catch { /* best effort */ }
	}
</script>

{#if target}
	<aside class="install-hint" aria-label="Install this app on your iPhone or iPad">
		<div class="text">
			<strong>Install on your iPhone</strong>
			{#if target === 'safari'}
				<p>Tap the <b>Share</b> button <span class="share" aria-hidden="true">⬆︎</span> in Safari's toolbar, then <b>Add to Home Screen</b> → <b>Add</b>. It then opens full-screen and works offline in Room 12.</p>
			{:else if target === 'chrome'}
				<p>In Chrome, tap the <b>Share</b> button <span class="share" aria-hidden="true">⬆︎</span> in the address bar, then <b>Add to Home Screen</b> → <b>Add</b>. If you don't see it (iOS older than 16.4), open this page in <b>Safari</b> instead.</p>
			{:else}
				<p>Open <b>husbandry.rummerlab.com</b> in <b>Safari</b>, tap <b>Share</b> <span class="share" aria-hidden="true">⬆︎</span>, then <b>Add to Home Screen</b>.</p>
			{/if}
		</div>
		<button type="button" class="dismiss" onclick={dismiss} aria-label="Dismiss install instructions">✕</button>
	</aside>
{/if}

<style>
	.install-hint {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		padding: 0.85rem 1rem;
		border: 1px solid #bfdbfe;
		border-left: 4px solid var(--accent, #1d5fb8);
		border-radius: 10px;
		background: var(--accent-wash, #e8f0fb);
		color: var(--ink, #13213a);
		font-size: 0.88rem;
	}
	.text { flex: 1; min-width: 0; }
	.text p { margin: 0.3rem 0 0; line-height: 1.45; }
	.share { display: inline-block; padding: 0 0.2rem; border: 1px solid currentColor; border-radius: 4px; font-size: 0.8em; }
	.dismiss { flex: none; min-width: 44px; min-height: 44px; border: none; background: transparent; color: inherit; font-size: 1rem; cursor: pointer; }
</style>
