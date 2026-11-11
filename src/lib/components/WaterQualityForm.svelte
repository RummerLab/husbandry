<script lang="ts">
	import { validateModule, NOT_MEASURED } from "../validation";
	import { measurementInputValue, toggleNotMeasured, includeWeeklyMeasurements } from '../waterQualityMeasurements';
	import type { WaterQualityData } from '../types';

	type MeasurableField = Exclude<keyof WaterQualityData, 'date' | 'initials' | 'isWeeklyCheck' | 'notes'>;

	interface Props {
		data: WaterQualityData;
		onValidChange?: (isValid: boolean) => void;
	}

	let { data = $bindable(), onValidChange }: Props = $props();

	let isValid = $derived(validateModule('waterQuality', data).length === 0);

	$effect(() => {
		if (onValidChange) onValidChange(isValid);
	});

	// Explicit "Not measured" for tests done elsewhere or only sometimes (e.g. pH by MARFU, PO4 only with a SpinTouch).
	// It is an answer, not a skip: validation still requires every field, and the sheet gets a blank cell.
</script>

{#snippet notMeasuredToggle(field: keyof WaterQualityData, label: string)}
	<button type="button" class="not-measured-btn" class:on={data[field] === NOT_MEASURED} aria-pressed={data[field] === NOT_MEASURED} aria-label={`${label}: not measured this time`} onclick={() => data = toggleNotMeasured(data, field)}>
		{data[field] === NOT_MEASURED ? '✓ Not measured' : 'Not measured'}
	</button>
{/snippet}

{#snippet measurableInput(field: MeasurableField, placeholder: string, label: string)}
	<input
		type="text"
		{placeholder}
		inputmode="decimal"
		aria-label={label}
		data-field={field}
		value={measurementInputValue(data[field])}
		readonly={data[field] === NOT_MEASURED}
		title={data[field] === NOT_MEASURED ? 'Not measured' : undefined}
		oninput={(e) => {
			if (data[field] === NOT_MEASURED) return;
			data[field] = e.currentTarget.value;
		}}
	/>
{/snippet}

<div class="form-container">
	<div class="header-box">
		<div class="header-text">
			<h3>Room 12 Water Quality Log</h3>
			<p class="subtitle">Side A & Side B system testing (Routine at least every second day + Weekly Chemistry)</p>
		</div>
		<div class="btn-group-header">


		</div>
	</div>

	<!-- Initials -->
	<div class="section-card">
		<h4>1. Analyst Personnel</h4>
		<div class="input-field">
			<label for="wq-initials">
				Analyst Initials <span class="required-star">*</span>
			</label>
			<input
				id="wq-initials"
				type="text"
				placeholder="e.g. TV or CD"
				data-field="initials" bind:value={data.initials}
				required
			/>
		</div>
	</div>

	<!-- Routine checks: at least every second day, including weekends -->
	<div class="section-card">
		<h4>2. Routine Checks (at least every second day, including weekends)</h4>
		<p class="section-hint">All routine fields are required. Enter numbers only, without units or % signs (pH must be 0–14). If the DO meter is unavailable, enter N/A. If pH was not measured this time (e.g. measured by MARFU), tap <em>Not measured</em> below that side.</p>

		<div class="table-grid">
			<div class="grid-header">
				<span>Parameter</span>
				<span>Side A</span>
				<span>Side B</span>
			</div>

			<div class="grid-row">
				<div class="param-title">
					<strong>Temperature (°C)</strong>
					<span class="required-star">*</span>
				</div>
				<input type="text" placeholder="26.3" inputmode="decimal" aria-label="Temperature (°C) Side A" data-field="tempA" bind:value={data.tempA} />
				<input type="text" placeholder="26.2" inputmode="decimal" aria-label="Temperature (°C) Side B" data-field="tempB" bind:value={data.tempB} />
			</div>

			<div class="grid-row">
				<div class="param-title">
					<strong>Salinity (ppt)</strong>
					<span class="required-star">*</span>
				</div>
				<input type="text" placeholder="36" inputmode="decimal" aria-label="Salinity (ppt) Side A" data-field="salinityA" bind:value={data.salinityA} />
				<input type="text" placeholder="36" inputmode="decimal" aria-label="Salinity (ppt) Side B" data-field="salinityB" bind:value={data.salinityB} />
			</div>

			<div class="grid-row">
				<div class="param-title">
					<strong>pH</strong>
					<span class="required-star">*</span>
				</div>
				<div class="measurement">
					{@render measurableInput('pHA', '8.20', 'pH Side A')}
					{@render notMeasuredToggle('pHA', 'pH Side A')}
				</div>
				<div class="measurement">
					{@render measurableInput('pHB', '8.25', 'pH Side B')}
					{@render notMeasuredToggle('pHB', 'pH Side B')}
				</div>
			</div>

			<div class="grid-row">
				<div class="param-title">
					<strong>Dissolved Oxygen (%)</strong>
					<span class="required-star">*</span>
				</div>
				<input type="text" placeholder="98" aria-label="Dissolved Oxygen (%) Side A" data-field="doA" bind:value={data.doA} />
				<input type="text" placeholder="98" aria-label="Dissolved Oxygen (%) Side B" data-field="doB" bind:value={data.doB} />
			</div>
		</div>
	</div>

	<!-- Weekly Testing Panel -->
	<div class="section-card">
		<div class="card-header-flex">
			<h4>3. Weekly Water Chemistry (API / Spintouch)</h4>
			<label class="toggle-label">
				<input type="checkbox" checked={data.isWeeklyCheck} onchange={(event) => data = includeWeeklyMeasurements(data, event.currentTarget.checked)} />
				<span>Include Weekly Data</span>
			</label>
		</div>

		{#if data.isWeeklyCheck}
			<p class="section-hint weekly-hint">With weekly data included, every weekly field needs an answer. Enter numbers only; 0 is a valid reading. Tap <em>Not measured</em> below the side not tested (e.g. PO4 without a SpinTouch); it is left blank in the sheet.</p>
			<div class="table-grid">
				<div class="grid-header">
					<span>Parameter</span>
					<span>Side A</span>
					<span>Side B</span>
				</div>

				<div class="grid-row">
					<div class="param-title">Alkalinity (dKH / ppm) <span class="required-star">*</span>
					</div>
					<div class="measurement">
						{@render measurableInput('alkA', '116', 'Alkalinity Side A')}
						{@render notMeasuredToggle('alkA', 'Alkalinity Side A')}
					</div>
					<div class="measurement">
						{@render measurableInput('alkB', '118', 'Alkalinity Side B')}
						{@render notMeasuredToggle('alkB', 'Alkalinity Side B')}
					</div>
				</div>

				<div class="grid-row">
					<div class="param-title">Weekly pH <span class="required-star">*</span>
					</div>
					<div class="measurement">
						{@render measurableInput('weeklypHA', '8.2', 'Weekly pH Side A')}
						{@render notMeasuredToggle('weeklypHA', 'Weekly pH Side A')}
					</div>
					<div class="measurement">
						{@render measurableInput('weeklypHB', '8.2', 'Weekly pH Side B')}
						{@render notMeasuredToggle('weeklypHB', 'Weekly pH Side B')}
					</div>
				</div>

				<div class="grid-row">
					<div class="param-title">Ammonia NH3 (ppm) <span class="required-star">*</span>
					</div>
					<div class="measurement">
						{@render measurableInput('nh3A', '0', 'Ammonia NH3 (ppm) Side A')}
						{@render notMeasuredToggle('nh3A', 'Ammonia NH3 Side A')}
					</div>
					<div class="measurement">
						{@render measurableInput('nh3B', '0', 'Ammonia NH3 (ppm) Side B')}
						{@render notMeasuredToggle('nh3B', 'Ammonia NH3 Side B')}
					</div>
				</div>

				<div class="grid-row">
					<div class="param-title">Nitrite NO2 (ppm) <span class="required-star">*</span>
					</div>
					<div class="measurement">
						{@render measurableInput('no2A', '0', 'Nitrite NO2 (ppm) Side A')}
						{@render notMeasuredToggle('no2A', 'Nitrite NO2 Side A')}
					</div>
					<div class="measurement">
						{@render measurableInput('no2B', '0', 'Nitrite NO2 (ppm) Side B')}
						{@render notMeasuredToggle('no2B', 'Nitrite NO2 Side B')}
					</div>
				</div>

				<div class="grid-row">
					<div class="param-title">Nitrate NO3 (ppm) <span class="required-star">*</span>
					</div>
					<div class="measurement">
						{@render measurableInput('no3A', '20', 'Nitrate NO3 (ppm) Side A')}
						{@render notMeasuredToggle('no3A', 'Nitrate NO3 Side A')}
					</div>
					<div class="measurement">
						{@render measurableInput('no3B', '15', 'Nitrate NO3 (ppm) Side B')}
						{@render notMeasuredToggle('no3B', 'Nitrate NO3 Side B')}
					</div>
				</div>

				<div class="grid-row">
					<div class="param-title">Phosphate PO4 (ppm) <span class="required-star">*</span>
					</div>
					<div class="measurement">
						{@render measurableInput('po4A', '1.5', 'Phosphate PO4 (ppm) Side A')}
						{@render notMeasuredToggle('po4A', 'Phosphate PO4 Side A')}
					</div>
					<div class="measurement">
						{@render measurableInput('po4B', '1.8', 'Phosphate PO4 (ppm) Side B')}
						{@render notMeasuredToggle('po4B', 'Phosphate PO4 Side B')}
					</div>
				</div>
			</div>
		{:else}
			<p class="section-hint">Toggle checkbox above if performing full weekly water chemistry test.</p>
		{/if}
	</div>

	<!-- Notes -->
	<div class="section-card">
		<h4>Observations, Water Changes & Actions</h4>
		<div class="input-field">
			<label for="wq-notes">Notes</label>
			<textarea
				id="wq-notes"
				rows="2"
				placeholder="e.g. Weekly 1000L water change on side A completed, Spintouch calibrated..."
				data-field="notes" bind:value={data.notes}
			></textarea>
		</div>
	</div>
</div>

<style>
	.measurement {
		min-width: 0;
	}

	.not-measured-btn {
		display: block;
		margin-top: 0.35rem;
		min-height: 48px;
		max-width: 100%;
		white-space: normal;
		overflow-wrap: anywhere;
		padding: 0.25rem 0.6rem;
		border: 1px solid var(--border, #cbd5e1);
		border-radius: 999px;
		background: var(--surface, #fff);
		color: var(--ink-2, #334155);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.not-measured-btn.on {
		background: #e2e8f0;
		border-color: #64748b;
		color: #0f172a;
		font-weight: 600;
	}

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

	.btn-group-header {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
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
		flex-wrap: wrap;
		gap: 0.4rem 0.75rem;
		border-bottom: 2px solid #f1f5f9;
		padding-bottom: 0.4rem;
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

	.section-hint {
		font-size: 0.8rem;
		color: #64748b;
		margin: -0.4rem 0 0.8rem;
	}

	.weekly-hint {
		margin: 0.8rem 0 0.6rem;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.86rem;
		font-weight: 600;
		color: #0284c7;
		cursor: pointer;
	}

	.table-grid {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.grid-header {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.2fr);
		gap: 0.6rem;
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		color: #64748b;
		padding: 0 0.4rem;
	}

	.grid-row {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.2fr);
		gap: 0.6rem;
		align-items: center;
		background: #f8fafc;
		padding: 0.5rem 0.65rem;
		border-radius: 6px;
		border: 1px solid #f1f5f9;
	}

	.param-title {
		font-size: 0.88rem;
		color: #1e293b;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.grid-row input {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		padding: 0.45rem 0.6rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 5px;
		font-size: 0.88rem;
		outline: none;
		color: #1e293b;
		background: #ffffff;
	}

	.grid-row input[readonly] {
		text-align: center;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.02em;
		color: #475569;
		background: #e2e8f0;
	}

	.grid-row input:focus {
		border-color: #1d5fb8;
		box-shadow: 0 0 0 2px rgba(29, 95, 184, 0.15);
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
		font-family: inherit;
	}

	.input-field input:focus,
	.input-field textarea:focus {
		border-color: #1d5fb8;
		box-shadow: 0 0 0 3px rgba(29, 95, 184, 0.15);
	}

	/* Narrow phones: keep Side A and Side B on screen (320–375px). */
	@media (max-width: 480px) {
		.section-card {
			padding: 0.85rem 0.7rem;
		}

		.grid-header,
		.grid-row {
			grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
			gap: 0.4rem;
		}

		.grid-header {
			padding: 0 0.3rem;
		}

		.grid-row {
			padding: 0.45rem 0.4rem;
		}

		.param-title {
			font-size: 0.8rem;
		}

		.grid-row input {
			padding: 0.45rem 0.4rem;
			font-size: 16px; /* also stops iOS zooming on focus */
		}
	}
</style>
