<script lang="ts">
	import { onMount } from 'svelte';
	import { ANALYTICS_PREFERENCE_KEY, createUsageAnalytics } from '../analytics';

	let controller: ReturnType<typeof createUsageAnalytics> | undefined;
	let enabled = $state(false);
	let blocked = $state(false);
	let message = $state('');
	onMount(() => {
		controller = createUsageAnalytics(window, document);
		controller.start();
		enabled = controller.preference === 'granted' && !controller.blocked;
		blocked = controller.blocked;
		const changed = (event: StorageEvent) => {
			if (event.key === ANALYTICS_PREFERENCE_KEY || event.key === null) {
				controller?.start(); enabled = controller?.preference === 'granted' && !controller.blocked;
			}
		};
		window.addEventListener('storage', changed);
		return () => { window.removeEventListener('storage', changed); controller = undefined; };
	});

	function change(event: Event) {
		const allow = (event.currentTarget as HTMLInputElement).checked;
		if (!controller?.choose(allow)) { enabled = false; message = 'Preference could not be saved. Analytics stays off.'; }
		else { enabled = allow && !controller.blocked; message = enabled ? 'Optional analytics enabled.' : 'Optional analytics disabled.'; }
	}
</script>

<footer class="analytics-preference" aria-label="Usage analytics preference">
	<label>
		<input type="checkbox" checked={enabled} disabled={blocked} onchange={change} />
		<span>Allow optional usage analytics</span>
	</label>
	<p>Uses Google Analytics cookies for aggregate page visits. Husbandry entries, initials and device IDs are excluded. You can change this choice here.</p>
	{#if blocked}<p>Analytics is off because your browser requests privacy.</p>{/if}
	<p aria-live="polite">{message}</p>
</footer>

<style>
	.analytics-preference { max-width: 850px; margin: 1rem auto; padding: 1rem; color: #475569; font-size: .8rem; }
	label { display: flex; gap: .6rem; align-items: center; min-height: 48px; cursor: pointer; }
	input { width: 20px; height: 20px; accent-color: #1d5fb8; }
	p { margin: .25rem 0; line-height: 1.5; }
</style>
