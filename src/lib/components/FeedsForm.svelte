<script lang="ts">
	import { validateModule } from "../validation";
	import type { FeedsData } from '../types';
	import { ROOM12_TANKS } from '../tanksConfig';
	import OptionSelector from './OptionSelector.svelte';

	interface Props {
		data: FeedsData;
		onValidChange?: (isValid: boolean) => void;
	}

	let { data = $bindable(), onValidChange }: Props = $props();

	// Ensure tank entries exist
	for (const tank of ROOM12_TANKS) {
		if (!data.tanks[tank.id]) {
			data.tanks[tank.id] = {
				amountFed: '',
				meds: {},
				uneatenGrams: ''
			};
		}
	}

	// Strict ethics validation: all active tanks must be logged
	let incompleteTanks = $derived.by(() => {
		const missing: string[] = [];
		for (const tank of ROOM12_TANKS) {
			const entry = data.tanks[tank.id];
			if (!entry || !entry.amountFed?.trim()) {
				missing.push(`${tank.name} (Fed g)`);
				continue;
			}
			if (!entry.uneatenGrams?.trim()) {
				missing.push(`${tank.name} (Uneaten g)`);
				continue;
			}
			if (tank.medicationType !== 'None') {
				for (const shark of tank.sharks) {
					if (shark.medId && !entry.meds[shark.medId]) {
						missing.push(`${tank.name} (${shark.label} ${tank.medicationType})`);
					}
				}
			}
		}
		return missing;
	});

	let isValid = $derived(validateModule('feeds', data).length === 0);

	$effect(() => {
		if (onValidChange) onValidChange(isValid);
	});

</script>

<div class="form-container">
	<div class="header-box">
		<div class="header-text">
			<h3>Room 12 Feeding Log</h3>
			<p class="subtitle">Record exact food intake, supplement administration (Elasmotab/Formula), & uneaten feed</p>
		</div>

	</div>

	{#if incompleteTanks.length > 0}
		<div class="ethics-warning-banner">
			<strong>⚠️ Animal Ethics Compliance Guard:</strong>
			<span>All tanks and medication checkboxes must be explicitly filled to proceed ({incompleteTanks.length} items remaining).</span>
		</div>
	{/if}

	<!-- Initials -->
	<div class="section-card">
		<h4>1. Feeding Personnel</h4>
		<div class="input-field">
			<label for="feeds-initials">
				Feeder Initials <span class="required-star">*</span>
			</label>
			<input
				id="feeds-initials"
				type="text"
				placeholder="e.g. SE + AC"
				bind:value={data.initials}
				required
			/>
		</div>
	</div>

	<!-- Tanks Feeding List -->
	<div class="tanks-grid">
		{#each ROOM12_TANKS as tank}
			{@const entry = data.tanks[tank.id]}
			{@const isTankComplete = entry && entry.amountFed?.trim() && entry.uneatenGrams?.trim()}
			<div class="tank-card" class:incomplete={!isTankComplete}>
				<div class="tank-header">
					<div class="tank-title">
						<h5>{tank.name}</h5>
						{#if tank.targetAmt}
							<span class="target-badge">Target: {tank.targetAmt}</span>
						{/if}
					</div>
					<div class="sharks-tags">
						{#each tank.sharks as shark}
							<span class="shark-pill">{shark.label}</span>
						{/each}
					</div>
				</div>

				<div class="tank-body">
					<div class="input-row">
						<div class="input-field mini">
							<label for="feed-amt-{tank.id}">
								Fed (g) <span class="required-star">*</span>
							</label>
							<input
								id="feed-amt-{tank.id}"
								type="text"
								placeholder={tank.targetAmt ? tank.targetAmt.replace('g', '') : 'e.g. 50'}
								bind:value={data.tanks[tank.id].amountFed}
								required
							/>
						</div>

						<div class="input-field mini">
							<label for="feed-uneaten-{tank.id}">
								Uneaten (g) <span class="required-star">*</span>
							</label>
							<input
								id="feed-uneaten-{tank.id}"
								type="text"
								placeholder="0"
								bind:value={data.tanks[tank.id].uneatenGrams}
								required
							/>
						</div>
					</div>

					{#if tank.medicationType !== 'None' && tank.sharks.some((s: { medId?: string }) => Boolean(s.medId))}
						<div class="meds-section">
							<span class="meds-title">{tank.medicationType} Administered (Mandatory):</span>
							<div class="meds-options">
								{#each tank.sharks as shark}
									{#if shark.medId}
										{@const medKey = shark.medId}
										<div class="med-item">
											<span class="med-label">{medKey}:</span>
											<div class="btn-group">
												<button
													type="button"
													class="med-btn"
													class:active={data.tanks[tank.id].meds[medKey] === 'Y'}
													onclick={() => (data.tanks[tank.id].meds[medKey] = 'Y')}
												>
													Y
												</button>
												<button
													type="button"
													class="med-btn"
													class:active={data.tanks[tank.id].meds[medKey] === 'N'}
													onclick={() => (data.tanks[tank.id].meds[medKey] = 'N')}
												>
													N
												</button>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Notes -->
	<div class="section-card">
		<h4>General Feeding Observations</h4>
		<div class="input-field">
			<label for="feeds-notes">Appetite, refusals, diet changes</label>
			<textarea
				id="feeds-notes"
				rows="2"
				placeholder="e.g. HO107 ate eagerly, AM081 transitioned to prawn diet..."
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
		background: #fdf4ff;
		border: 1px solid #f5d0fe;
		border-radius: 10px;
	}

	.header-text h3 {
		margin: 0;
		color: #86198f;
		font-size: 1.15rem;
	}

	.subtitle {
		margin: 0.2rem 0 0;
		font-size: 0.82rem;
		color: #a21caf;
	}



	.ethics-warning-banner {
		padding: 0.75rem 1rem;
		background: #fff1f2;
		border: 1.5px solid #fecdd3;
		border-radius: 8px;
		color: #be123c;
		font-size: 0.86rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
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

	.tanks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
		gap: 0.9rem;
	}

	.tank-card {
		background: #ffffff;
		border: 1.5px solid #e2e8f0;
		border-radius: 8px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		transition: border-color 0.15s;
	}

	.tank-card.incomplete {
		border-color: #fca5a5;
		background: #fffdfd;
	}

	.tank-header {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		border-bottom: 1px solid #f1f5f9;
		padding-bottom: 0.5rem;
	}

	.tank-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.tank-title h5 {
		margin: 0;
		font-size: 0.95rem;
		color: #1e293b;
		font-weight: 700;
	}

	.target-badge {
		background: #eff6ff;
		color: #1d4ed8;
		border: 1px solid #dbeafe;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
	}

	.sharks-tags {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.shark-pill {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #475569;
		font-size: 0.72rem;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}

	.tank-body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.input-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.6rem;
	}

	.input-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.input-field.mini label {
		font-size: 0.78rem;
		font-weight: 600;
		color: #475569;
	}

	.input-field.mini input {
		padding: 0.4rem 0.6rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 5px;
		font-size: 0.88rem;
		color: #1e293b;
		outline: none;
	}

	.input-field.mini input:focus {
		border-color: #1d5fb8;
		box-shadow: 0 0 0 2px rgba(29, 95, 184, 0.15);
	}

	.meds-section {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		background: #fafafa;
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px dashed #e2e8f0;
	}

	.meds-title {
		font-size: 0.76rem;
		font-weight: 600;
		color: #64748b;
	}

	.meds-options {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.med-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.med-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #334155;
	}

	.btn-group {
		display: flex;
		border-radius: 4px;
		overflow: hidden;
		border: 1px solid #cbd5e1;
	}

	.med-btn {
		background: #ffffff;
		border: none;
		border-right: 1px solid #cbd5e1;
		padding: 0.15rem 0.45rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.med-btn:last-child {
		border-right: none;
	}

	.med-btn.active {
		background: #1d5fb8;
		color: #ffffff;
	}

	.required-star {
		color: #dc2626;
	}

	.input-field textarea {
		padding: 0.65rem 0.85rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.92rem;
		color: #1e293b;
		outline: none;
		font-family: inherit;
	}

	.input-field textarea:focus {
		border-color: #1d5fb8;
		box-shadow: 0 0 0 3px rgba(29, 95, 184, 0.15);
	}
</style>
