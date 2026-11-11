<script lang="ts">
	import { validateModule } from "../validation";
	import type { LSSData } from '../types';
	import OptionSelector from './OptionSelector.svelte';

	interface Props {
		data: LSSData;
		onValidChange?: (isValid: boolean) => void;
	}

	let { data = $bindable(), onValidChange }: Props = $props();

	// Derived validation: all required fields must be answered
	let isValid = $derived(validateModule('lss', data).length === 0);

	$effect(() => {
		if (onValidChange) onValidChange(isValid);
	});

	// Shift-part records show only that shift's items; pre-split records show everything.
	let showAM = $derived(data.shiftPart !== 'PM');
	let showPM = $derived(data.shiftPart !== 'AM');

</script>

<div class="form-container">
	<div class="header-box">
		<div class="header-text">
			<h3>{data.shiftPart ? `${data.shiftPart} ` : ''}Life Support Systems (LSS) Checks</h3>
			<p class="subtitle">Room 12 Maintenance & Checks (Daily, including weekends & public holidays)</p>
		</div>

	</div>

	<!-- Person In Charge -->
	<div class="section-card">
		<h4>Personnel & Initials</h4>
		<div class={data.shiftPart ? '' : 'grid-2'}>
			{#if showAM}
			<div class="input-field">
				<label for="lss-am-initials">
					AM Initials <span class="required-star">*</span>
				</label>
				<input
					id="lss-am-initials"
					type="text"
					placeholder="e.g. SE + AC"
					data-field="amInitials" bind:value={data.amInitials}
					required
				/>
			</div>
			{/if}
			{#if showPM}
			<div class="input-field">
				<label for="lss-pm-initials">PM Initials {#if data.shiftPart === 'PM'}<span class="required-star">*</span>{:else}(optional if AM only){/if}</label>
				<input
					id="lss-pm-initials"
					type="text"
					placeholder="e.g. JR"
					data-field="pmInitials" bind:value={data.pmInitials}
					required={data.shiftPart === 'PM'}
				/>
			</div>
			{/if}
		</div>
	</div>

	{#if showAM}
	<!-- Daily animal welfare check (required every day, including off days) -->
	<div class="section-card welfare-card">
		<h4>Animal Welfare Check (all tanks)</h4>
		<p class="section-hint">Required every day, including weekends and public holidays. Sight every animal and egg tank before answering.</p>
		<OptionSelector
			data-field="animalsChecked"
			label="All animals sighted, with normal appearance & behaviour"
			description="No redness, wounds, lethargy, abnormal breathing, escapes or deaths"
			options={[
				{ value: 'Y', label: 'Yes, all normal', badgeColor: 'green' },
				{ value: 'N', label: 'No, concern found', badgeColor: 'red' }
			]}
			bind:value={data.animalsChecked}
		/>
		{#if data.animalsChecked === 'N'}
			<p class="escalation-note" role="alert">Describe the animal, tank and signs under <strong>New Concerns</strong> below, and escalate to a listed investigator now. Do not wait for the next scheduled check. <a href="/help#pathway">Escalation guide</a></p>
		{/if}
	</div>

	{/if}

	{#if showPM}
	<!-- Protein Skimmer & Filter Canister (PM shift) -->
	<div class="section-card">
		<h4>Protein Skimmer & Filtration</h4>
		<div class="grid-2">
			<OptionSelector
				label="Protein Skimmer: Venturi"
				description="Checked & operational"
				options={[
					{ value: '/', label: 'Normal (/)', badgeColor: 'green' },
					{ value: 'Y', label: 'Yes', badgeColor: 'blue' },
					{ value: 'N', label: 'Issue (No)', badgeColor: 'red' },
					{ value: 'N/A', label: 'N/A', badgeColor: 'gray' }
				]}
				data-field="skimmerVenturi" bind:value={data.skimmerVenturi}
			/>
			<OptionSelector
				label="Protein Skimmer: Spray Down"
				description="Cleaned / sprayed down"
				options={[
					{ value: '/', label: 'Normal (/)', badgeColor: 'green' },
					{ value: 'Y', label: 'Yes', badgeColor: 'blue' },
					{ value: 'N', label: 'No', badgeColor: 'red' },
					{ value: 'N/A', label: 'N/A', badgeColor: 'gray' }
				]}
				data-field="skimmerSprayDown" bind:value={data.skimmerSprayDown}
			/>
			<OptionSelector
				label="Filter Canister: Cleaned"
				description="Canister filter cleaned"
				options={[
					{ value: 'Y', label: 'Cleaned (Y)', badgeColor: 'green' },
					{ value: 'N', label: 'Not Cleaned', badgeColor: 'gray' },
					{ value: '/', label: 'Checked (/)', badgeColor: 'blue' }
				]}
				data-field="filterCleaned" bind:value={data.filterCleaned}
			/>
			<OptionSelector
				label="Filter Canister: Replaced"
				description="Media / cartridge replaced"
				options={[
					{ value: '/', label: 'No need (/)', badgeColor: 'gray' },
					{ value: 'Y', label: 'Replaced (Y)', badgeColor: 'amber' },
					{ value: 'N', label: 'No', badgeColor: 'blue' }
				]}
				data-field="filterReplaced" bind:value={data.filterReplaced}
			/>
		</div>
	</div>

	{/if}

	<!-- Tanks 1-8 Checks -->
	<div class="section-card">
		<h4>Tanks 1–8 Daily Checks</h4>
		<div class="grid-2">
			{#if showAM}
			<OptionSelector
				label="Water levels sufficient (AM)"
				description="All tanks 1-8 adequate level"
				data-field="waterLevelsAM" bind:value={data.waterLevelsAM}
			/>
			{/if}
			{#if showPM}
			<OptionSelector
				label="Water levels sufficient (PM)"
				description="All tanks 1-8 adequate level"
				data-field="waterLevelsPM" bind:value={data.waterLevelsPM}
			/>
			{/if}
			{#if showAM}
			<OptionSelector
				label="Water coming out of pipes (AM)"
				description="Proper circulation confirmed"
				data-field="waterFlowAM" bind:value={data.waterFlowAM}
			/>
			{/if}
			{#if showPM}
			<OptionSelector
				label="Water coming out of pipes (PM)"
				description="Proper circulation confirmed"
				data-field="waterFlowPM" bind:value={data.waterFlowPM}
			/>
			{/if}
			{#if showAM}
			<OptionSelector
				label="Airstones ON in tanks (AM)"
				description="Aeration running properly"
				data-field="airstonesAM" bind:value={data.airstonesAM}
			/>
			{/if}
			{#if showPM}
			<OptionSelector
				label="Airstones ON in tanks (PM)"
				description="Aeration running properly"
				data-field="airstonesPM" bind:value={data.airstonesPM}
			/>
			{/if}
		</div>
		{#if data.shiftPart === 'AM'}
			<p class="section-hint">Also look over the room for leaks or equipment faults on your way through, and note anything under New Concerns. Filters, skimmer and hygiene are recorded by the PM shift.</p>
		{/if}
	</div>

	{#if showPM}
	<!-- Maintenance & Hygiene -->
	<div class="section-card">
		<h4>Maintenance & Room Hygiene</h4>
		<div class="grid-2">
			<OptionSelector
				label="Vac + Net tanks"
				description="Debris netted and vacuumed"
				data-field="vacNetTanks" bind:value={data.vacNetTanks}
			/>
			<OptionSelector
				label="Tanks scrubbed"
				description="Walls & substrate scrubbed"
				options={[
					{ value: 'Y', label: 'Yes', badgeColor: 'green' },
					{ value: 'N', label: 'No (Routine)', badgeColor: 'gray' },
					{ value: '/', label: 'N/A (/)', badgeColor: 'blue' }
				]}
				data-field="tanksScrubbed" bind:value={data.tanksScrubbed}
			/>
			<OptionSelector
				label="Overflow (O/F) cleaned"
				description="Standpipes & overflows clear"
				data-field="overflowCleaned" bind:value={data.overflowCleaned}
			/>
			<OptionSelector
				label="Hose -> floor, ladder & tools"
				description="Rinsed down and clean"
				data-field="hoseFloorLadder" bind:value={data.hoseFloorLadder}
			/>
			<OptionSelector
				label="Foot tub refilled, lids on, squeegeed"
				description="Biosecurity foot tub, tank lids secured"
				data-field="footTubLidsSqueegee" bind:value={data.footTubLidsSqueegee}
			/>
			<OptionSelector
				label="Equipment disinfected"
				description="Nets, buckets, tools disinfected"
				data-field="equipmentDisinfected" bind:value={data.equipmentDisinfected}
			/>
		</div>
	</div>

	{/if}

	<!-- Notes & Concerns -->
	<div class="section-card">
		<h4>Observations & Ethics Concerns</h4>
		<div class="input-field">
			<label for="lss-concerns">
				New Concerns (Ethics / Animal Welfare / Equipment)
				{#if data.animalsChecked === 'N'}<span class="required-star">*</span>{/if}
			</label>
			<input
				id="lss-concerns"
				type="text"
				placeholder="e.g. None or leak noted on pump B"
				data-field="concerns" bind:value={data.concerns}
				required={data.animalsChecked === 'N'}
			/>
		</div>
		<div class="input-field" style="margin-top: 0.75rem;">
			<label for="lss-notes">General Notes</label>
			<textarea
				id="lss-notes"
				rows="2"
				placeholder="Notes on water changes, calibration, etc."
				data-field="notes" bind:value={data.notes}
			></textarea>
		</div>
	</div>
</div>

<style>
	.form-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.header-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 10px;
	}

	.header-text h3 {
		margin: 0;
		color: #14532d;
		font-size: 1.15rem;
	}

	.subtitle {
		margin: 0.2rem 0 0;
		font-size: 0.82rem;
		color: #166534;
	}



	.section-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1.1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.section-card h4 {
		margin: 0 0 0.9rem;
		color: #0f172a;
		font-size: 0.98rem;
		border-bottom: 2px solid #f1f5f9;
		padding-bottom: 0.4rem;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 0.85rem;
	}

	.input-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.input-field label {
		font-size: 0.88rem;
		font-weight: 600;
		color: #334155;
	}

	.required-star {
		color: #dc2626;
	}

	.input-field input,
	.input-field textarea {
		padding: 0.65rem 0.85rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.92rem;
		color: #1e293b;
		outline: none;
		transition: border-color 0.15s;
		font-family: inherit;
	}

	.input-field input:focus,
	.input-field textarea:focus {
		border-color: #1d5fb8;
		box-shadow: 0 0 0 3px rgba(29, 95, 184, 0.15);
	}
	.section-hint {
		margin: -0.25rem 0 0.75rem;
		font-size: 0.82rem;
		color: #475569;
	}

	.welfare-card {
		border-left: 4px solid #16a34a;
	}

	.escalation-note {
		margin: 0.75rem 0 0;
		padding: 0.6rem 0.8rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #991b1b;
		font-size: 0.85rem;
	}
</style>
