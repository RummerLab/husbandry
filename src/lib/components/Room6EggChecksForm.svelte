<script lang="ts">
	import type { Room6EggChecksData } from '../types';
	import OptionSelector from './OptionSelector.svelte';

	let { data = $bindable() }: { data: Room6EggChecksData } = $props();

	const groups = [
		{ count: 'windCount', ids: 'windIds', label: 'Wind eggs', idsHint: 'Tank or IDs, e.g. tank 3' },
		{ count: 'newCount', ids: 'newIds', label: 'New eggs', idsHint: 'e.g. HO031, AM089' },
		{ count: 'embryoCount', ids: 'embryoIds', label: 'Embryos developed', idsHint: 'e.g. AM009 + HO006' },
		{ count: 'deadCount', ids: 'deadIds', label: 'Dead eggs', idsHint: 'e.g. HO080 + HO031' }
	] as const;
	const counted = (key: (typeof groups)[number]['count']) => /^\d+$/.test(data[key].trim()) && Number(data[key]) > 0;
</script>

<div class="form-container">
	<div class="section-card">
		<h3>Room 6 Egg Checks</h3>
		<p class="hint">Eggs moved from Room 12. Enter 0 where there are none; IDs are needed for any eggs counted.</p>
		<div class="input-field">
			<label for="r6e-initials">Initials <span class="required-star">*</span></label>
			<input id="r6e-initials" type="text" placeholder="e.g. MB" data-field="initials" bind:value={data.initials} required />
		</div>
		<OptionSelector
			data-field="candling"
			label="Candling completed?"
			options={[
				{ value: 'Y', label: 'Yes', badgeColor: 'green' },
				{ value: 'N', label: 'No', badgeColor: 'gray' }
			]}
			bind:value={data.candling}
		/>
	</div>

	{#each groups as group (group.count)}
		<div class="section-card">
			<h4>{group.label}</h4>
			<div class="pair">
				<div class="input-field">
					<label for={`r6e-${group.count}`}>How many? <span class="required-star">*</span></label>
					<input id={`r6e-${group.count}`} type="text" inputmode="numeric" placeholder="0" data-field={group.count} bind:value={data[group.count]} required />
				</div>
				<div class="input-field">
					<label for={`r6e-${group.ids}`}>IDs {#if counted(group.count)}<span class="required-star">*</span>{/if}</label>
					<input id={`r6e-${group.ids}`} type="text" placeholder={group.idsHint} data-field={group.ids} bind:value={data[group.ids]} required={counted(group.count)} />
				</div>
			</div>
		</div>
	{/each}

	<div class="section-card">
		<div class="input-field">
			<label for="r6e-notes">Notes</label>
			<textarea id="r6e-notes" rows="2" placeholder="Anything unusual, who you told" data-field="notes" bind:value={data.notes}></textarea>
		</div>
	</div>
</div>

<style>
	.form-container { display: flex; flex-direction: column; gap: 1rem; }
	.section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
	h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
	h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
	.hint { margin: 0; font-size: 0.82rem; color: #475569; }
	.pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 0.75rem; }
	.input-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
	.input-field label { font-size: 0.85rem; font-weight: 600; color: #334155; }
	.input-field input, .input-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 48px; padding: 0.5rem 0.65rem; border: 1.5px solid #cbd5e1; border-radius: 6px; font: inherit; font-size: 0.9rem; }
	.required-star { color: #dc2626; }
</style>
