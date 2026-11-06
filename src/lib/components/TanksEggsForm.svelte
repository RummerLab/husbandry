<script lang="ts">
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

	let isValid = $derived(
		Boolean(
			data.initials?.trim() &&
			data.palpationHO103 &&
			data.palpationHO102 &&
			data.palpationHO116 &&
			data.palpationHO105 &&
			data.palpationHO117 &&
			data.newEmbryos &&
			data.candling &&
			data.foodRecordsEnteredPM &&
			data.whatsappUpdateAM &&
			data.whatsappUpdatePM
		)
	);

	$effect(() => {
		if (onValidChange) onValidChange(isValid);
	});

	function setAllFemalesZero() {
		data.palpationHO103 = '0';
		data.palpationHO102 = '0';
		data.palpationHO116 = '0';
		data.palpationHO105 = '0';
		data.palpationHO117 = '0';
	}

	function setStandardEggChecks() {
		setAllFemalesZero();
		if (!data.windEggs) data.windEggs = '0';
		if (!data.newEggs) data.newEggs = '0';
		if (!data.newEggTag) data.newEggTag = '0';
		data.newEmbryos = 'N';
		data.candling = 'Y';
		if (!data.deadEggTag) data.deadEggTag = '0';
		data.foodRecordsEnteredPM = 'Y';
		data.whatsappUpdateAM = 'Y';
		data.whatsappUpdatePM = 'Y';
		if (!data.moveDescription) data.moveDescription = 'None';
	}
</script>

<div class="form-container">
	<div class="header-box">
		<div class="header-text">
			<h3>Tanks + Eggs Checks</h3>
			<p class="subtitle">Daily female palpations, egg collection, embryology & room updates</p>
		</div>
		<button type="button" class="quick-pass-btn" onclick={setStandardEggChecks}>
			⚡ Quick Fill Normal (0 Eggs / None Palpated)
		</button>
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
				bind:value={data.initials}
				required
			/>
		</div>
	</div>

	<!-- Female Palpations -->
	<div class="section-card">
		<div class="card-header-flex">
			<h4>2. Females Palpated?</h4>
			<button type="button" class="small-btn" onclick={setAllFemalesZero}>
				Set All to 0 (None)
			</button>
		</div>
		<p class="legend">Legend: <strong>0</strong> = None | <strong>B</strong> = Both sides | <strong>L</strong> = Left | <strong>R</strong> = Right</p>
		<div class="grid-2">
			<OptionSelector
				label="HO103 (Female)"
				options={palpationOptions}
				bind:value={data.palpationHO103}
			/>
			<OptionSelector
				label="HO102 (Female)"
				options={palpationOptions}
				bind:value={data.palpationHO102}
			/>
			<OptionSelector
				label="HO116 (Female)"
				options={palpationOptions}
				bind:value={data.palpationHO116}
			/>
			<OptionSelector
				label="HO105 (Female)"
				options={palpationOptions}
				bind:value={data.palpationHO105}
			/>
			<OptionSelector
				label="HO117 (Female)"
				options={palpationOptions}
				bind:value={data.palpationHO117}
			/>
		</div>
	</div>

	<!-- Egg Checks -->
	<div class="section-card">
		<h4>3. Egg & Embryo Checks</h4>
		<div class="grid-2">
			<div class="input-field">
				<label for="wind-eggs">Wind Eggs? (Infertile/uncalcified)</label>
				<input
					id="wind-eggs"
					type="text"
					placeholder="0 or e.g. 1x - HO116"
					bind:value={data.windEggs}
				/>
			</div>
			<div class="input-field">
				<label for="new-eggs">New Eggs Found</label>
				<input
					id="new-eggs"
					type="text"
					placeholder="0 or e.g. HO105 x1 + HO117 x1"
					bind:value={data.newEggs}
				/>
			</div>
			<div class="input-field">
				<label for="new-egg-tag">New Egg Tag(s)</label>
				<input
					id="new-egg-tag"
					type="text"
					placeholder="0 or e.g. 105 = AM081"
					bind:value={data.newEggTag}
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
				bind:value={data.newEmbryos}
			/>
			<OptionSelector
				label="Candling Done?"
				description="Candling check completed"
				options={[
					{ value: 'Y', label: 'Yes (Y)', badgeColor: 'green' },
					{ value: 'N', label: 'No (N)', badgeColor: 'red' },
					{ value: 'X', label: 'N/A (X)', badgeColor: 'gray' }
				]}
				bind:value={data.candling}
			/>
			<div class="input-field">
				<label for="dead-egg-tag">Dead Egg Tag?</label>
				<input
					id="dead-egg-tag"
					type="text"
					placeholder="0 or dead egg IDs"
					bind:value={data.deadEggTag}
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
				bind:value={data.foodRecordsEnteredPM}
			/>
			<OptionSelector
				label="WhatsApp Update: AM Run"
				description="Lab group notified of AM check"
				bind:value={data.whatsappUpdateAM}
			/>
			<OptionSelector
				label="WhatsApp Update: PM Run"
				description="Lab group notified of PM check"
				bind:value={data.whatsappUpdatePM}
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
					bind:value={data.moveDescription}
				/>
			</div>
			<div class="input-field">
				<label for="move-from">From Tank</label>
				<input
					id="move-from"
					type="text"
					placeholder="e.g. Tank 6 or /"
					bind:value={data.moveFrom}
				/>
			</div>
			<div class="input-field">
				<label for="move-to">To Tank</label>
				<input
					id="move-to"
					type="text"
					placeholder="e.g. Tank 2 or /"
					bind:value={data.moveTo}
				/>
			</div>
			<div class="input-field">
				<label for="move-qty">Quantity</label>
				<input
					id="move-qty"
					type="text"
					placeholder="e.g. x1 or /"
					bind:value={data.moveQty}
				/>
			</div>
		</div>
		<div class="input-field" style="margin-top: 0.75rem;">
			<label for="tanks-notes">Observations / Notes</label>
			<textarea
				id="tanks-notes"
				rows="2"
				placeholder="Body scores, health observations, etc."
				bind:value={data.observationsNotes}
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
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		border-radius: 10px;
	}

	.header-text h3 {
		margin: 0;
		color: #0369a1;
		font-size: 1.15rem;
	}

	.subtitle {
		margin: 0.2rem 0 0;
		font-size: 0.82rem;
		color: #0284c7;
	}

	.quick-pass-btn {
		background: #0284c7;
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
		background: #0369a1;
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

	.small-btn {
		background: #e0f2fe;
		color: #0369a1;
		border: 1px solid #bae6fd;
		border-radius: 4px;
		padding: 0.25rem 0.6rem;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.legend {
		font-size: 0.8rem;
		color: #64748b;
		margin: -0.3rem 0 0.8rem;
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
		border-color: #0284c7;
		box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
	}
</style>
