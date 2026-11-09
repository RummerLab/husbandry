<script lang="ts">
	import { validateModule } from "../validation";
	import type { WaterQualityData } from '../types';

	interface Props {
		data: WaterQualityData;
		onValidChange?: (isValid: boolean) => void;
	}

	let { data = $bindable(), onValidChange }: Props = $props();

	let isValid = $derived(validateModule('waterQuality', data).length === 0);

	$effect(() => {
		if (onValidChange) onValidChange(isValid);
	});


</script>

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
		<p class="section-hint">Mandatory parameters for daily marine life support</p>

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
				<input type="text" placeholder="e.g. 26.3" data-field="tempA" bind:value={data.tempA} />
				<input type="text" placeholder="e.g. 26.2" data-field="tempB" bind:value={data.tempB} />
			</div>

			<div class="grid-row">
				<div class="param-title">
					<strong>Salinity (ppt)</strong>
					<span class="required-star">*</span>
				</div>
				<input type="text" placeholder="e.g. 36" data-field="salinityA" bind:value={data.salinityA} />
				<input type="text" placeholder="e.g. 36" data-field="salinityB" bind:value={data.salinityB} />
			</div>

			<div class="grid-row">
				<div class="param-title">
					<strong>pH</strong>
				</div>
				<input type="text" placeholder="e.g. 8.20" data-field="pHA" bind:value={data.pHA} />
				<input type="text" placeholder="e.g. 8.25" data-field="pHB" bind:value={data.pHB} />
			</div>

			<div class="grid-row">
				<div class="param-title">
					<strong>Dissolved Oxygen (%)</strong>
				</div>
				<input type="text" placeholder="e.g. 98% or /" data-field="doA" bind:value={data.doA} />
				<input type="text" placeholder="e.g. 98% or /" data-field="doB" bind:value={data.doB} />
			</div>
		</div>
	</div>

	<!-- Weekly Testing Panel -->
	<div class="section-card">
		<div class="card-header-flex">
			<h4>3. Weekly Water Chemistry (API / Spintouch)</h4>
			<label class="toggle-label">
				<input type="checkbox" bind:checked={data.isWeeklyCheck} />
				<span>Include Weekly Data</span>
			</label>
		</div>

		{#if data.isWeeklyCheck}
			<div class="table-grid" style="margin-top: 0.8rem;">
				<div class="grid-header">
					<span>Parameter</span>
					<span>Side A</span>
					<span>Side B</span>
				</div>

				<div class="grid-row">
					<div class="param-title">Alkalinity (dKH / ppm)</div>
					<input type="text" placeholder="e.g. 116" data-field="alkA" bind:value={data.alkA} />
					<input type="text" placeholder="e.g. 118" data-field="alkB" bind:value={data.alkB} />
				</div>

				<div class="grid-row">
					<div class="param-title">Weekly pH</div>
					<input type="text" placeholder="e.g. 8.2" data-field="weeklypHA" bind:value={data.weeklypHA} />
					<input type="text" placeholder="e.g. 8.2" data-field="weeklypHB" bind:value={data.weeklypHB} />
				</div>

				<div class="grid-row">
					<div class="param-title">Ammonia NH3 (ppm)</div>
					<input type="text" placeholder="0" data-field="nh3A" bind:value={data.nh3A} />
					<input type="text" placeholder="0" data-field="nh3B" bind:value={data.nh3B} />
				</div>

				<div class="grid-row">
					<div class="param-title">Nitrite NO2 (ppm)</div>
					<input type="text" placeholder="0" data-field="no2A" bind:value={data.no2A} />
					<input type="text" placeholder="0" data-field="no2B" bind:value={data.no2B} />
				</div>

				<div class="grid-row">
					<div class="param-title">Nitrate NO3 (ppm)</div>
					<input type="text" placeholder="e.g. 20" data-field="no3A" bind:value={data.no3A} />
					<input type="text" placeholder="e.g. 15" data-field="no3B" bind:value={data.no3B} />
				</div>

				<div class="grid-row">
					<div class="param-title">Phosphate PO4 (ppm)</div>
					<input type="text" placeholder="e.g. 1.5" data-field="po4A" bind:value={data.po4A} />
					<input type="text" placeholder="e.g. 1.8" data-field="po4B" bind:value={data.po4B} />
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
		grid-template-columns: 2fr 1.2fr 1.2fr;
		gap: 0.6rem;
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		color: #64748b;
		padding: 0 0.4rem;
	}

	.grid-row {
		display: grid;
		grid-template-columns: 2fr 1.2fr 1.2fr;
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
		align-items: center;
		gap: 0.25rem;
	}

	.grid-row input {
		padding: 0.45rem 0.6rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 5px;
		font-size: 0.88rem;
		outline: none;
		color: #1e293b;
		background: #ffffff;
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
</style>
