<script lang="ts">
	import { NOT_MEASURED } from '../validation';
	import type { Room6Data } from '../types';
	import OptionSelector from './OptionSelector.svelte';

	let { data = $bindable() }: { data: Room6Data } = $props();

	const togglePH = () => { data.pH = data.pH === NOT_MEASURED ? '' : NOT_MEASURED; };
</script>

<div class="form-container">
	<div class="header-box">
		<h3>Room 6 (Egg Room) Check</h3>
		<p class="subtitle">Daily egg check and water readings for Room 6. Provisional fields until the lab confirms the Room 6 record.</p>
	</div>

	<div class="section-card">
		<h4>Personnel</h4>
		<div class="input-field">
			<label for="room6-initials">Initials <span class="required-star">*</span></label>
			<input id="room6-initials" type="text" placeholder="e.g. SE + AC" data-field="initials" bind:value={data.initials} required />
		</div>
	</div>

	<div class="section-card welfare-card">
		<h4>Egg Check</h4>
		<p class="section-hint">Sight every egg case before answering.</p>
		<OptionSelector
			data-field="eggsChecked"
			label="All eggs sighted, with normal appearance"
			description="No discolouration, damage, fungus or unexpected changes in the embryo"
			options={[
				{ value: 'Y', label: 'Yes, all normal', badgeColor: 'green' },
				{ value: 'N', label: 'No, concern found', badgeColor: 'red' }
			]}
			bind:value={data.eggsChecked}
		/>
		{#if data.eggsChecked === 'N'}
			<p class="escalation-note" role="alert">Describe the egg, its tag and what you saw under <strong>Concerns</strong> below, and tell a listed investigator now. See the Escalation Guide for Room 6 actions.</p>
		{/if}
		<div class="input-field">
			<label for="room6-dead">Dead or unviable eggs removed <span class="required-star">*</span></label>
			<input id="room6-dead" type="text" inputmode="numeric" placeholder="0" data-field="deadEggsRemoved" bind:value={data.deadEggsRemoved} required />
		</div>
	</div>

	<div class="section-card">
		<h4>Water Readings</h4>
		<p class="section-hint">Enter numbers only, without units. If pH was not measured this time, tap <em>Not measured</em>.</p>
		<div class="grid-3">
			<div class="input-field">
				<label for="room6-temp">Temperature (°C) <span class="required-star">*</span></label>
				<input id="room6-temp" type="text" inputmode="decimal" placeholder="26.0" data-field="temp" bind:value={data.temp} required />
			</div>
			<div class="input-field">
				<label for="room6-salinity">Salinity (ppt) <span class="required-star">*</span></label>
				<input id="room6-salinity" type="text" inputmode="decimal" placeholder="35" data-field="salinity" bind:value={data.salinity} required />
			</div>
			<div class="input-field">
				<label for="room6-ph">pH <span class="required-star">*</span></label>
				<input id="room6-ph" type="text" inputmode="decimal" placeholder="8.2" data-field="pH" bind:value={data.pH} readonly={data.pH === NOT_MEASURED} />
				<button type="button" class="not-measured-btn" class:on={data.pH === NOT_MEASURED} aria-pressed={data.pH === NOT_MEASURED} aria-label="pH: not measured this time" onclick={togglePH}>
					{data.pH === NOT_MEASURED ? '✓ Not measured' : 'Not measured'}
				</button>
			</div>
		</div>
		<OptionSelector
			data-field="waterChange"
			label="Water change today"
			description="Room 6 changes are done by students (see the Escalation Guide)"
			options={[
				{ value: 'None', label: 'None', badgeColor: 'gray' },
				{ value: '50%', label: '50%', badgeColor: 'blue' },
				{ value: '75%', label: '75%', badgeColor: 'blue' },
				{ value: 'Other', label: 'Other (describe in notes)', badgeColor: 'amber' }
			]}
			bind:value={data.waterChange}
		/>
	</div>

	<div class="section-card">
		<h4>Concerns & Notes</h4>
		<div class="input-field">
			<label for="room6-concerns">Concerns {#if data.eggsChecked === 'N'}<span class="required-star">*</span>{/if}</label>
			<input id="room6-concerns" type="text" placeholder="e.g. None, or egg R6-03 discoloured" data-field="concerns" bind:value={data.concerns} required={data.eggsChecked === 'N'} />
		</div>
		<div class="input-field">
			<label for="room6-notes">Notes {#if data.waterChange === 'Other'}<span class="required-star">*</span>{/if}</label>
			<textarea id="room6-notes" rows="2" placeholder="Water changes, retests, who you told" data-field="notes" bind:value={data.notes} required={data.waterChange === 'Other'}></textarea>
		</div>
	</div>
</div>

<style>
	.form-container { display: flex; flex-direction: column; gap: 1.25rem; }
	.header-box h3 { margin: 0; font-size: 1.15rem; color: var(--ink-1, #0f172a); }
	.subtitle { margin: 0.25rem 0 0; font-size: 0.85rem; color: var(--ink-2, #475569); }
	.section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
	.section-card h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
	.welfare-card { border-left: 4px solid #0ea5e9; }
	.section-hint { margin: 0; font-size: 0.82rem; color: #475569; }
	.escalation-note { margin: 0; padding: 0.6rem 0.75rem; border-radius: 6px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; }
	.grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
	.input-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
	.input-field label { font-size: 0.85rem; font-weight: 600; color: #334155; }
	.input-field input, .input-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 48px; padding: 0.5rem 0.65rem; border: 1.5px solid #cbd5e1; border-radius: 6px; font: inherit; font-size: 0.9rem; }
	.required-star { color: #dc2626; }
	.not-measured-btn { min-height: 48px; max-width: 100%; white-space: normal; padding: 0.25rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 999px; background: #fff; color: #334155; font-size: 0.8rem; cursor: pointer; }
	.not-measured-btn.on { background: #e2e8f0; border-color: #64748b; color: #0f172a; font-weight: 600; }
	@media (max-width: 480px) { .grid-3 { grid-template-columns: minmax(0, 1fr); } }
</style>
