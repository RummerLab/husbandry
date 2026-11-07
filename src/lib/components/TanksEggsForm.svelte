<script lang="ts">
	import { validateModule } from "../validation";
	import type { TanksEggsData, PalpationOption } from '../types';
	import OptionSelector from './OptionSelector.svelte';

	interface Props {
		data: TanksEggsData;
		onValidChange?: (isValid: boolean) => void;
	}

	let { data = $bindable(), onValidChange }: Props = $props();

	const palpationOptions = [
		{ value: '0', label: '0 (None)', badgeColor: 'green' },
		{ value: 'B', label: 'B (Both sides)', badgeColor: 'blue' },
		{ value: 'L', label: 'L (Left side)', badgeColor: 'amber' },
		{ value: 'R', label: 'R (Right side)', badgeColor: 'amber' },
		{ value: 'N/A', label: 'N/A', badgeColor: 'gray' }
	];

	let isValid = $derived(validateModule('tanksEggs', data).length === 0);

	$effect(() => {
		if (onValidChange) onValidChange(isValid);
	});


</script>

<div class="form-container">
	<div class="header-box">
		<div class="header-text">
			<h3>Tanks + Eggs Checks</h3>
			<p class="subtitle">Daily female palpations, egg collection, embryology & room updates</p>
		</div>

	</div>

	<!-- Initials -->
	<div class="section-card">
		<h4>1. Personnel & Initials</h4>
		<div class="input-field">
			<label for="tanks-initials">
				Observer Initials <span class="required-star">*</span>
			</label>
			<input
				id="tanks-initials"
				type="text"
				placeholder="e.g. SE + AC"
				data-field="initials" bind:value={data.initials}
					required
			/>
		</div>
	</div>

	<!-- Female Palpations -->
	<div class="section-card">
		<div class="card-header-flex">
			<h4>2. Females Palpated?</h4>

		</div>
		<p class="legend">Legend: <strong>0</strong> = None | <strong>B</strong> = Both sides | <strong>L</strong> = Left | <strong>R</strong> = Right</p>
		<div class="grid-2">
			<OptionSelector
				label="HO103 (Female)"
				options={palpationOptions}
				data-field="palpationHO103" bind:value={data.palpationHO103}
			/>
			<OptionSelector
				label="HO102 (Female)"
				options={palpationOptions}
				data-field="palpationHO102" bind:value={data.palpationHO102}
			/>
			<OptionSelector
				label="HO116 (Female)"
				options={palpationOptions}
				data-field="palpationHO116" bind:value={data.palpationHO116}
			/>
			<OptionSelector
				label="HO105 (Female)"
				options={palpationOptions}
				data-field="palpationHO105" bind:value={data.palpationHO105}
			/>
			<OptionSelector
				label="HO117 (Female)"
				options={palpationOptions}
				data-field="palpationHO117" bind:value={data.palpationHO117}
			/>
		</div>
	</div>

	<!-- Egg Checks -->
	<div class="section-card">
		<h4>3. Egg & Embryo Checks</h4>
		<div class="grid-2">
			<div class="input-field">
				<label for="wind-eggs">Wind Eggs? (Infertile/uncalcified) <span class="required-star" aria-hidden="true">*</span></label>
				<input
					id="wind-eggs"
					type="text"
					placeholder="0 or e.g. 1x - HO116"
					data-field="windEggs" bind:value={data.windEggs}
					required
				/>
			</div>
			<div class="input-field">
				<label for="new-eggs">New Eggs Found <span class="required-star" aria-hidden="true">*</span></label>
				<input
					id="new-eggs"
					type="text"
					placeholder="0 or e.g. HO105 x1 + HO117 x1"
					data-field="newEggs" bind:value={data.newEggs}
					required
				/>
			</div>
			<div class="input-field">
				<label for="new-egg-tag">New Egg Tag(s) <span class="required-star" aria-hidden="true">*</span></label>
				<input
					id="new-egg-tag"
					type="text"
					placeholder="0 or e.g. 105 = AM081"
					data-field="newEggTag" bind:value={data.newEggTag}
					required
				/>
			</div>
			<OptionSelector
				label="New Embryos?"
				description="Embryonic development observed"
				options={[
					{ value: 'N', label: 'None (N)', badgeColor: 'gray' },
					{ value: 'Y', label: 'Yes (Y)', badgeColor: 'green' },
					{ value: 'X', label: 'Not checked (X)', badgeColor: 'amber' }
				]}
				data-field="newEmbryos" bind:value={data.newEmbryos}
			/>
			<OptionSelector
				label="Candling Done?"
				description="Candling check completed"
				options={[
					{ value: 'Y', label: 'Yes (Y)', badgeColor: 'green' },
					{ value: 'N', label: 'No (N)', badgeColor: 'red' },
					{ value: 'X', label: 'N/A (X)', badgeColor: 'gray' }
				]}
				data-field="candling" bind:value={data.candling}
			/>
			<div class="input-field">
				<label for="dead-egg-tag">Dead Egg Tag? <span class="required-star" aria-hidden="true">*</span></label>
				<input
					id="dead-egg-tag"
					type="text"
					placeholder="0 or dead egg IDs"
					data-field="deadEggTag" bind:value={data.deadEggTag}
					required
				/>
			</div>
		</div>
	</div>

	<!-- Records & Communication Updates -->
	<div class="section-card">
		<h4>4. Records & Communication Updates</h4>
		<div class="grid-2">
			<OptionSelector
				label="Food records entered? (PM)"
				description="Feeding spreadsheet / logs verified"
				data-field="foodRecordsEnteredPM" bind:value={data.foodRecordsEnteredPM}
			/>
			<OptionSelector
				label="WhatsApp Update: AM Run"
				description="Lab group notified of AM check"
				data-field="whatsappUpdateAM" bind:value={data.whatsappUpdateAM}
			/>
			<OptionSelector
				label="WhatsApp Update: PM Run"
				description="Lab group notified of PM check"
				data-field="whatsappUpdatePM" bind:value={data.whatsappUpdatePM}
			/>
		</div>
	</div>

	<!-- Moves / Mortalities -->
	<div class="section-card">
		<h4>5. Animal & Egg Transfers / Mortalities</h4>
		<div class="grid-2">
			<div class="input-field">
				<label for="move-desc">Description (Transfer / Mortality)</label>
				<input
					id="move-desc"
					type="text"
					placeholder="None or OUT - HO144 (mortality)"
					data-field="moveDescription" bind:value={data.moveDescription}
				/>
			</div>
			<div class="input-field">
				<label for="move-from">From Tank</label>
				<input
					id="move-from"
					type="text"
					placeholder="e.g. Tank 6 or /"
					data-field="moveFrom" bind:value={data.moveFrom}
				/>
			</div>
			<div class="input-field">
				<label for="move-to">To Tank</label>
				<input
					id="move-to"
					type="text"
					placeholder="e.g. Tank 2 or /"
					data-field="moveTo" bind:value={data.moveTo}
				/>
			</div>
			<div class="input-field">
				<label for="move-qty">Quantity</label>
				<input
					id="move-qty"
					type="text"
					placeholder="e.g. x1 or /"
					data-field="moveQty" bind:value={data.moveQty}
				/>
			</div>
		</div>
		<div class="input-field" style="margin-top: 0.75rem;">
			<label for="tanks-notes">Observations / Notes</label>
			<textarea
				id="tanks-notes"
				rows="2"
				placeholder="Body scores, health observations, etc."
				data-field="observationsNotes" bind:value={data.observationsNotes}
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
		background: #e8f0fb;
		border: 1px solid #cde2fb;
		border-radius: 10px;
	}

	.header-text h3 {
		margin: 0;
		color: #1a4f99;
		font-size: 1.15rem;
	}

	.subtitle {
		margin: 0.2rem 0 0;
		font-size: 0.82rem;
		color: #3a4a5f;
	}



	.section-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 1.1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.card-header-flex {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2px solid #f1f5f9;
		padding-bottom: 0.4rem;
		margin-bottom: 0.6rem;
	}

	.card-header-flex h4 {
		margin: 0;
		border-bottom: none;
		padding-bottom: 0;
	}

	.section-card h4 {
		margin: 0 0 0.9rem;
		color: #0f172a;
		font-size: 0.98rem;
		border-bottom: 2px solid #f1f5f9;
		padding-bottom: 0.4rem;
	}


	.legend {
		font-size: 0.8rem;
		color: #64748b;
		margin: -0.3rem 0 0.8rem;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
		gap: 0.85rem;
	}

	.input-field {
		min-width: 0;
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
		width: 100%;
		min-width: 0;
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
