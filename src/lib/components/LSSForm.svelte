<script lang="ts">
	import type { LSSData } from '../types';
	import OptionSelector from './OptionSelector.svelte';

	interface Props {
		data: LSSData;
		onValidChange?: (isValid: boolean) => void;
	}

	let { data = $bindable(), onValidChange }: Props = $props();

	// Derived validation: all required fields must be answered
	let isValid = $derived(
		Boolean(
			data.amInitials?.trim() &&
			data.skimmerVenturi &&
			data.skimmerSprayDown &&
			data.filterCleaned &&
			data.filterReplaced &&
			data.waterLevelsAM &&
			data.waterLevelsPM &&
			data.waterFlowAM &&
			data.waterFlowPM &&
			data.airstonesAM &&
			data.airstonesPM &&
			data.vacNetTanks &&
			data.tanksScrubbed &&
			data.overflowCleaned &&
			data.hoseFloorLadder &&
			data.footTubLidsSqueegee &&
			data.equipmentDisinfected
		)
	);

	$effect(() => {
		if (onValidChange) onValidChange(isValid);
	});

	function applyAllStandard() {
		data.skimmerVenturi = '/';
		data.skimmerSprayDown = '/';
		data.filterCleaned = 'Y';
		data.filterReplaced = '/';
		data.waterLevelsAM = 'Y';
		data.waterLevelsPM = 'Y';
		data.waterFlowAM = 'Y';
		data.waterFlowPM = 'Y';
		data.airstonesAM = 'Y';
		data.airstonesPM = 'Y';
		data.vacNetTanks = 'Y';
		data.tanksScrubbed = 'N';
		data.overflowCleaned = 'Y';
		data.hoseFloorLadder = 'Y';
		data.footTubLidsSqueegee = 'Y';
		data.equipmentDisinfected = 'Y';
		if (!data.concerns) data.concerns = 'None';
	}
</script>

<div class="form-container">
	<div class="header-box">
		<div class="header-text">
			<h3>Life Support Systems (LSS) Checks</h3>
			<p class="subtitle">Room 12 Daily Maintenance & Checks (Mon, Wed & Fri focus)</p>
		</div>
		<button type="button" class="quick-pass-btn" onclick={applyAllStandard}>
			⚡ Quick Fill Standard (Normal Run)
		</button>
	</div>

	<!-- Person In Charge -->
	<div class="section-card">
		<h4>1. Personnel & Initials</h4>
		<div class="grid-2">
			<div class="input-field">
				<label for="lss-am-initials">
					AM Initials <span class="required-star">*</span>
				</label>
				<input
					id="lss-am-initials"
					type="text"
					placeholder="e.g. SE + AC"
					bind:value={data.amInitials}
					required
				/>
			</div>
			<div class="input-field">
				<label for="lss-pm-initials">PM Initials (optional if AM only)</label>
				<input
					id="lss-pm-initials"
					type="text"
					placeholder="e.g. JR"
					bind:value={data.pmInitials}
				/>
			</div>
		</div>
	</div>

	<!-- Protein Skimmer & Filter Canister -->
	<div class="section-card">
		<h4>2. Protein Skimmer & Filtration</h4>
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
				bind:value={data.skimmerVenturi}
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
				bind:value={data.skimmerSprayDown}
			/>
			<OptionSelector
				label="Filter Canister: Cleaned"
				description="Canister filter cleaned"
				options={[
					{ value: 'Y', label: 'Cleaned (Y)', badgeColor: 'green' },
					{ value: 'N', label: 'Not Cleaned', badgeColor: 'gray' },
					{ value: '/', label: 'Checked (/)', badgeColor: 'blue' }
				]}
				bind:value={data.filterCleaned}
			/>
			<OptionSelector
				label="Filter Canister: Replaced"
				description="Media / cartridge replaced"
				options={[
					{ value: '/', label: 'No need (/)', badgeColor: 'gray' },
					{ value: 'Y', label: 'Replaced (Y)', badgeColor: 'amber' },
					{ value: 'N', label: 'No', badgeColor: 'blue' }
				]}
				bind:value={data.filterReplaced}
			/>
		</div>
	</div>

	<!-- Tanks 1-8 Checks -->
	<div class="section-card">
		<h4>3. Tanks 1–8 Daily Checks</h4>
		<div class="grid-2">
			<OptionSelector
				label="Water levels sufficient (AM)"
				description="All tanks 1-8 adequate level"
				bind:value={data.waterLevelsAM}
			/>
			<OptionSelector
				label="Water levels sufficient (PM)"
				description="All tanks 1-8 adequate level"
				bind:value={data.waterLevelsPM}
			/>
			<OptionSelector
				label="Water coming out of pipes (AM)"
				description="Proper circulation confirmed"
				bind:value={data.waterFlowAM}
			/>
			<OptionSelector
				label="Water coming out of pipes (PM)"
				description="Proper circulation confirmed"
				bind:value={data.waterFlowPM}
			/>
			<OptionSelector
				label="Airstones ON in tanks (AM)"
				description="Aeration running properly"
				bind:value={data.airstonesAM}
			/>
			<OptionSelector
				label="Airstones ON in tanks (PM)"
				description="Aeration running properly"
				bind:value={data.airstonesPM}
			/>
		</div>
	</div>

	<!-- Maintenance & Hygiene -->
	<div class="section-card">
		<h4>4. Maintenance & Room Hygiene</h4>
		<div class="grid-2">
			<OptionSelector
				label="Vac + Net tanks"
				description="Debris netted and vacuumed"
				bind:value={data.vacNetTanks}
			/>
			<OptionSelector
				label="Tanks scrubbed"
				description="Walls & substrate scrubbed"
				options={[
					{ value: 'Y', label: 'Yes', badgeColor: 'green' },
					{ value: 'N', label: 'No (Routine)', badgeColor: 'gray' },
					{ value: '/', label: 'N/A (/)', badgeColor: 'blue' }
				]}
				bind:value={data.tanksScrubbed}
			/>
			<OptionSelector
				label="Overflow (O/F) cleaned"
				description="Standpipes & overflows clear"
				bind:value={data.overflowCleaned}
			/>
			<OptionSelector
				label="Hose -> floor, ladder & tools"
				description="Rinsed down and clean"
				bind:value={data.hoseFloorLadder}
			/>
			<OptionSelector
				label="Foot tub refilled, lids on, squeegeed"
				description="Biosecurity foot tub, tank lids secured"
				bind:value={data.footTubLidsSqueegee}
			/>
			<OptionSelector
				label="Equipment disinfected"
				description="Nets, buckets, tools disinfected"
				bind:value={data.equipmentDisinfected}
			/>
		</div>
	</div>

	<!-- Notes & Concerns -->
	<div class="section-card">
		<h4>5. Observations & Ethics Concerns</h4>
		<div class="input-field">
			<label for="lss-concerns">New Concerns (Ethics / Animal Welfare / Equipment)</label>
			<input
				id="lss-concerns"
				type="text"
				placeholder="e.g. None or leak noted on pump B"
				bind:value={data.concerns}
			/>
		</div>
		<div class="input-field" style="margin-top: 0.75rem;">
			<label for="lss-notes">General Notes</label>
			<textarea
				id="lss-notes"
				rows="2"
				placeholder="Notes on water changes, calibration, etc."
				bind:value={data.notes}
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

	.quick-pass-btn {
		background: #15803d;
		color: #ffffff;
		border: none;
		border-radius: 6px;
		padding: 0.55rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.quick-pass-btn:hover {
		background: #166534;
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
</style>
