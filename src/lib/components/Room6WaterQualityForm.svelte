<script lang="ts">
	import { NOT_MEASURED } from '../validation';
	import { measurementInputValue, toggleRoom6NotMeasured } from '../waterQualityMeasurements';
	import type { Room6WaterQualityData } from '../types';

	let { data = $bindable() }: { data: Room6WaterQualityData } = $props();

	type Field = 'temp' | 'salinity' | 'pH' | 'dissolvedOxygen' | 'alk' | 'weeklypH' | 'nh3' | 'no2' | 'no3' | 'po4';
	const routine: { key: Field; label: string; placeholder: string; skippable: boolean }[] = [
		{ key: 'temp', label: 'Temp (°C)', placeholder: '26.1', skippable: false },
		{ key: 'salinity', label: 'Salinity (ppt)', placeholder: '36', skippable: false },
		{ key: 'pH', label: 'pH', placeholder: '8.1', skippable: true },
		{ key: 'dissolvedOxygen', label: 'DO%', placeholder: '89', skippable: true }
	];
	const chemistry: { key: Field; label: string; placeholder: string; skippable: boolean }[] = [
		{ key: 'alk', label: 'Alk (dKH)', placeholder: '7', skippable: true },
		{ key: 'weeklypH', label: 'pH (weekly)', placeholder: '8.1', skippable: true },
		{ key: 'nh3', label: 'NH3 (ppm)', placeholder: '0', skippable: true },
		{ key: 'no2', label: 'NO2 (ppm)', placeholder: '0', skippable: true },
		{ key: 'no3', label: 'NO3 (ppm)', placeholder: '20', skippable: true },
		{ key: 'po4', label: 'PO4 (ppm)', placeholder: '0.8', skippable: true }
	];
	const toggle = (key: Field) => {
		data = toggleRoom6NotMeasured(data, key);
	};
</script>

{#snippet reading(field: { key: Field; label: string; placeholder: string; skippable: boolean })}
	<div class="input-field">
		<label for={`r6w-${field.key}`}>{field.label} <span class="required-star">*</span></label>
		<input
			id={`r6w-${field.key}`}
			type="text"
			inputmode="decimal"
			placeholder={field.placeholder}
			data-field={field.key}
			value={measurementInputValue(data[field.key])}
			readonly={data[field.key] === NOT_MEASURED}
			title={data[field.key] === NOT_MEASURED ? 'Not measured' : undefined}
			oninput={(e) => { if (data[field.key] !== NOT_MEASURED) data[field.key] = e.currentTarget.value; }}
		/>
		{#if field.skippable}
			<button type="button" class="not-measured-btn" class:on={data[field.key] === NOT_MEASURED} aria-pressed={data[field.key] === NOT_MEASURED} aria-label={`${field.label}: not measured this time`} onclick={() => toggle(field.key)}>
				{data[field.key] === NOT_MEASURED ? '✓ Not measured' : 'Not measured'}
			</button>
		{/if}
	</div>
{/snippet}

<div class="form-container">
	<div class="section-card">
		<h3>Room 6 Water Quality</h3>
		<p class="hint">Numbers only, without units. Temperature and salinity always need a reading; tap <em>Not measured</em> for anything not tested this time. It is left blank in the sheet.</p>
		<div class="input-field">
			<label for="r6w-initials">Initials <span class="required-star">*</span></label>
			<input id="r6w-initials" type="text" placeholder="e.g. MM" data-field="initials" bind:value={data.initials} required />
		</div>
	</div>

	<div class="section-card">
		<h4>Routine checks</h4>
		<div class="grid">
			{#each routine as field (field.key)}{@render reading(field)}{/each}
		</div>
	</div>

	<div class="section-card">
		<h4>Chemistry (API / SpinTouch)</h4>
		<div class="grid">
			{#each chemistry as field (field.key)}{@render reading(field)}{/each}
		</div>
	</div>

	<div class="section-card">
		<div class="input-field">
			<label for="r6w-notes">Notes</label>
			<textarea id="r6w-notes" rows="2" placeholder="e.g. Fresh water added, salinity lowered to 34 ppt" data-field="notes" bind:value={data.notes}></textarea>
		</div>
	</div>
</div>

<style>
	.form-container { display: flex; flex-direction: column; gap: 1rem; }
	.section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
	h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
	h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
	.hint { margin: 0; font-size: 0.82rem; color: #475569; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr)); gap: 0.75rem; }
	.input-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
	.input-field label { font-size: 0.85rem; font-weight: 600; color: #334155; }
	.input-field input, .input-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 48px; padding: 0.5rem 0.65rem; border: 1.5px solid #cbd5e1; border-radius: 6px; font: inherit; font-size: 0.9rem; }
	.input-field input[readonly] { text-align: center; color: #475569; background: #e2e8f0; }
	.required-star { color: #dc2626; }
	.not-measured-btn { min-height: 48px; max-width: 100%; white-space: normal; overflow-wrap: break-word; padding: 0.25rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 999px; background: #fff; color: #334155; font-size: 0.8rem; cursor: pointer; }
	.not-measured-btn.on { background: #e2e8f0; border-color: #64748b; color: #0f172a; font-weight: 600; }
</style>
