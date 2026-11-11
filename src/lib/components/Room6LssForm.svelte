<script lang="ts">
	import { ROOM6_CLEAN_TASKS, ROOM6_LSS_TANKS, ROOM6_TOP_UP, ROOM6_WATER_CHANGE, tankTaskKey } from '../room6Config';
	import type { Room6LssData } from '../types';
	import OptionSelector from './OptionSelector.svelte';

	let { data = $bindable() }: { data: Room6LssData } = $props();

	type Tick = `tank${string}_${string}` | 'sumpVac' | 'biofilterClean' | 'gutterVac' | 'gutterScrub';
	const toggle = (key: Tick) => { (data as unknown as Record<string, string>)[key] = (data as unknown as Record<string, string>)[key] === 'Y' ? '' : 'Y'; };
	const ticked = (key: Tick) => (data as unknown as Record<string, string>)[key] === 'Y';
	const flowOptions = [
		{ value: 'Y', label: 'Flowing', badgeColor: 'green' },
		{ value: 'N', label: 'Problem', badgeColor: 'red' }
	];
	let flowProblem = $derived([data.biofilterFlowAir, data.biofilterFlowWater, data.tankFlowAir, data.tankFlowWater].includes('N'));
</script>

{#snippet tick(key: Tick, label: string)}
	<button type="button" class="tick" class:on={ticked(key)} aria-pressed={ticked(key)} data-field={key} onclick={() => toggle(key)}>
		<span aria-hidden="true">{ticked(key) ? '✓' : '○'}</span> {label}
	</button>
{/snippet}

<div class="form-container">
	<div class="section-card">
		<h3>Room 6 LSS + Maintenance</h3>
		<p class="hint">Tick only the jobs you did. Flows are checked every time.</p>
		<div class="input-field">
			<label for="r6l-initials">Initials <span class="required-star">*</span></label>
			<input id="r6l-initials" type="text" placeholder="e.g. EP" data-field="initials" bind:value={data.initials} required />
		</div>
	</div>

	<div class="section-card">
		<h4>Flows</h4>
		<div class="grid-2">
			<OptionSelector data-field="biofilterFlowAir" label="Biofilter flow: air" options={flowOptions} bind:value={data.biofilterFlowAir} />
			<OptionSelector data-field="biofilterFlowWater" label="Biofilter flow: water" options={flowOptions} bind:value={data.biofilterFlowWater} />
			<OptionSelector data-field="tankFlowAir" label="Tank flow: air" options={flowOptions} bind:value={data.tankFlowAir} />
			<OptionSelector data-field="tankFlowWater" label="Tank flow: water" options={flowOptions} bind:value={data.tankFlowWater} />
		</div>
		{#if flowProblem}
			<p class="escalation-note" role="alert">Describe the flow problem and what you did under <strong>Notes</strong>, and tell the lab manager now.</p>
		{/if}
	</div>

	<div class="section-card">
		<h4>Tank cleans</h4>
		{#each ROOM6_LSS_TANKS as tank (tank.id)}
			<fieldset class="tank">
				<legend>{tank.name}</legend>
				<div class="ticks">
					{#each tank.tasks as task (task)}{@render tick(tankTaskKey(tank.id, task) as Tick, ROOM6_CLEAN_TASKS[task])}{/each}
				</div>
			</fieldset>
		{/each}
	</div>

	<div class="section-card">
		<h4>Sump, biofilter and gutters</h4>
		<OptionSelector
			data-field="sumpWaterChange"
			label="Sump water change"
			options={Object.keys(ROOM6_WATER_CHANGE).map(value => ({ value, label: value, badgeColor: value === 'None' ? 'gray' : 'blue' }))}
			bind:value={data.sumpWaterChange}
		/>
		<OptionSelector
			data-field="sumpTopUp"
			label="Sump top up"
			options={ROOM6_TOP_UP.map(value => ({ value, label: value, badgeColor: value === 'None' ? 'gray' : 'blue' }))}
			bind:value={data.sumpTopUp}
		/>
		<div class="ticks">
			{@render tick('sumpVac', 'Sump vac')}
			{@render tick('biofilterClean', 'Biofilter cleaned')}
			{@render tick('gutterVac', 'Gutters vac')}
			{@render tick('gutterScrub', 'Gutters scrub')}
		</div>
	</div>

	<div class="section-card">
		<div class="input-field">
			<label for="r6l-notes">Notes {#if flowProblem}<span class="required-star">*</span>{/if}</label>
			<textarea id="r6l-notes" rows="2" placeholder="e.g. Added fresh water to sump" data-field="notes" bind:value={data.notes} required={flowProblem}></textarea>
		</div>
	</div>
</div>

<style>
	.form-container { display: flex; flex-direction: column; gap: 1rem; }
	.section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
	h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
	h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
	.hint { margin: 0; font-size: 0.82rem; color: #475569; }
	.grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); gap: 0.75rem; }
	.tank { border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.75rem 0.75rem; margin: 0; min-width: 0; }
	legend { font-size: 0.85rem; font-weight: 700; color: #1e293b; padding: 0 0.25rem; }
	.ticks { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.tick { min-height: 48px; padding: 0.35rem 0.75rem; border: 1.5px solid #cbd5e1; border-radius: 999px; background: #fff; color: #334155; font: inherit; font-size: 0.85rem; cursor: pointer; }
	.tick.on { background: #dcfce7; border-color: #16a34a; color: #14532d; font-weight: 600; }
	.escalation-note { margin: 0; padding: 0.6rem 0.75rem; border-radius: 6px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; }
	.input-field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
	.input-field label { font-size: 0.85rem; font-weight: 600; color: #334155; }
	.input-field input, .input-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 48px; padding: 0.5rem 0.65rem; border: 1.5px solid #cbd5e1; border-radius: 6px; font: inherit; font-size: 0.9rem; }
	.required-star { color: #dc2626; }
</style>
