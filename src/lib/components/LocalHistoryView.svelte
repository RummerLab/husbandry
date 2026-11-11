<script lang="ts">
	import { readQueueSnapshot, observeDeviceQueue, snapshotTone, type QueueSnapshot } from '../queueSnapshot';
	import { onMount } from 'svelte';
	import type { LocalHistoryItem } from '../types';
	import { syncPendingSubmissions, getDeviceId } from '../storage';
	import { deliveryState } from '../submissionOutcome';

	let { masterSpreadsheetUrl }: { masterSpreadsheetUrl: string | null } = $props();

	let history = $state<LocalHistoryItem[]>([]);
	let deviceId = $state('');
	let isSyncing = $state(false);
	let syncMessage = $state('');
	let snapshot = $state<QueueSnapshot>({ kind: 'unavailable', message: 'Reading device records…' });

	onMount(() => {
		try { deviceId = getDeviceId(); loadHistory(); } catch (error) { syncMessage = String(error); }
		return observeDeviceQueue(loadHistory);
	});

	function loadHistory() {
		snapshot = readQueueSnapshot();
		history = snapshot.records ?? [];
	}

	async function handleSync() {
		isSyncing = true;
		syncMessage = '';
		try {
			await syncPendingSubmissions();
			loadHistory();
		} catch (err) {
			syncMessage = 'Sync failed. Check internet connection.';
		} finally {
			isSyncing = false;
		}
	}
</script>

<div class="history-container">
	<div class="history-header">
		<div>
			<h3>My Device Submissions</h3>
			<p class="subtitle">
				Device ID: <code>{deviceId}</code> — Showing only records submitted on this device.
			</p>
		</div>
		<button
			type="button"
			class="sync-btn"
			onclick={handleSync}
			disabled={isSyncing || snapshot.kind === 'unavailable' || (snapshot.kind === 'ready' && ['signInRequired', 'cooldown', 'syncing'].includes(snapshot.status))}
		>
			{isSyncing ? '⏳ Syncing...' : '🔄 Sync Offline Queue'}
		</button>
	</div>

	{#if syncMessage}
		<div class="sync-banner bad">
			{syncMessage}
		</div>
	{/if}
	<p class="sync-banner {snapshotTone(snapshot)}" role="status">
		{#if snapshot.kind === 'ready' && snapshot.status === 'signInRequired'}
			<a href="/login" rel="external">Sign in again to resume sync</a>.{snapshot.message.replace(/^Sign in again to resume sync\./, '')}
		{:else}
			{snapshot.message}
		{/if}
	</p>

	{#if snapshot.kind === 'unavailable'}
		<p>Records have not been removed. Keep this device data and contact the lab administrator.</p>
	{/if}
	{#if snapshot.kind === 'ready' && history.length === 0}
		<div class="empty-state">
			<div class="empty-icon">📋</div>
			<h4>No records submitted from this device yet</h4>
			<p>When you complete and submit husbandry records, your personal log will appear here.</p>
		</div>
	{:else if history.length > 0}
		<div class="records-list">
			{#each history as item}
				{@const delivery = deliveryState(item)}
				<div class="record-card" class:synced={delivery === 'synced'} class:pending={delivery !== 'synced'}>
					<div class="record-header">
						<div class="record-date-block">
							<span class="record-date">{item.date}</span>
							<span class="record-time">
								{new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</span>
						</div>
						<div class="badge-status">
							{#if delivery === 'synced'}
								<span class="status-pill synced">✓ Synced to Sheets</span>
							{:else}
								<span class="status-pill pending" title={item.syncError || 'Awaiting connection'}>
									{delivery === 'needsReview' ? '⚠ Needs review' : '⏳ Pending sync'}
								</span>
							{/if}
						</div>
					</div>

					<div class="record-body">
						<div class="record-initials">
							<strong>Initials:</strong> {item.initials}
						</div>
						<div class="record-modules">
							{#each item.modules ?? item.payload.modulesSubmitted as mod}
								<span class="mod-pill">
									{#if mod === 'lss'}{item.payload?.lss?.shiftPart ? `${item.payload.lss.shiftPart} LSS` : 'LSS Checks'}
									{:else if mod === 'tanksEggs'}Tanks & Eggs
									{:else if mod === 'feeds'}Feeds
									{:else if mod === 'waterQuality'}Water Quality
									{:else if mod === 'room6'}Room 6
									{:else if mod === 'room6Eggs'}Room 6 Egg Checks
									{:else if mod === 'room6WaterQuality'}Room 6 Water Quality
									{:else if mod === 'room6Lss'}Room 6 LSS
									{:else if mod === 'room6Ammonia'}Room 6 Ammonia + Nitrite
									{:else}{mod}{/if}
								</span>
							{/each}
						</div>
						{#if item.summary}
							<p class="record-summary">{item.summary}</p>
						{/if}
						{#if item.syncError}
							<p class="error-text">Sync error: {item.syncError}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="master-sheet-card">
		<div class="sheet-info">
			<h4>Master Research Spreadsheet</h4>
			<p>Full team data across all devices is consolidated in Dr. Jodie Rummer's master Google Sheet.</p>
		</div>
		{#if masterSpreadsheetUrl}
			<a
				href={masterSpreadsheetUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="sheet-link-btn"
			>
				Open Master Spreadsheet (Read-Only) ↗
			</a>
		{:else}
			<p>Master spreadsheet link unavailable. Please contact the lab administrator.</p>
		{/if}
	</div>
</div>

<style>
	.history-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
	}

	.history-header h3 {
		margin: 0;
		color: #0f172a;
		font-size: 1.15rem;
	}

	.subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.8rem;
		color: #64748b;
	}

	.subtitle code {
		background: #f1f5f9;
		padding: 0.15rem 0.35rem;
		border-radius: 4px;
		color: #1d5fb8;
	}

	.sync-btn {
		background: #1d5fb8;
		color: #ffffff;
		border: none;
		border-radius: 6px;
		padding: 0.55rem 0.9rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.sync-btn:hover:not(:disabled) {
		background: #1a4f99;
	}

	.sync-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.sync-banner {
		padding: 0.75rem 1rem;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 500;
	}
	.sync-banner.warn {
		background: #fffbeb;
		border-color: #fde68a;
		color: #92400e;
	}
	.sync-banner.bad {
		background: #fef2f2;
		border-color: #fca5a5;
		color: #991b1b;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1.5rem;
		background: #ffffff;
		border: 2px dashed #cbd5e1;
		border-radius: 12px;
	}

	.empty-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.empty-state h4 {
		margin: 0 0 0.4rem;
		color: #334155;
	}

	.empty-state p {
		margin: 0;
		color: #64748b;
		font-size: 0.88rem;
	}

	.records-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.record-card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.record-card.pending {
		border-left: 4px solid #f59e0b;
	}

	.record-card.synced {
		border-left: 4px solid #10b981;
	}

	.record-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.record-date-block {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.record-date {
		font-size: 1rem;
		font-weight: 700;
		color: #0f172a;
	}

	.record-time {
		font-size: 0.78rem;
		color: #64748b;
	}

	.status-pill {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.2rem 0.55rem;
		border-radius: 20px;
	}

	.status-pill.synced {
		background: #d1fae5;
		color: #065f46;
	}

	.status-pill.pending {
		background: #fef3c7;
		color: #92400e;
	}

	.record-body {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.record-initials {
		font-size: 0.85rem;
		color: #334155;
	}

	.record-modules {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.mod-pill {
		background: #f1f5f9;
		color: #475569;
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.record-summary {
		margin: 0.2rem 0 0;
		font-size: 0.82rem;
		color: #64748b;
	}

	.error-text {
		color: #dc2626;
		font-size: 0.78rem;
		margin: 0;
	}

	.master-sheet-card {
		margin-top: 1rem;
		background: #f8fafc;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		padding: 1.1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.sheet-info h4 {
		margin: 0 0 0.25rem;
		color: #0f172a;
		font-size: 0.95rem;
	}

	.sheet-info p {
		margin: 0;
		font-size: 0.8rem;
		color: #64748b;
	}

	.sheet-link-btn {
		background: #334155;
		color: #ffffff;
		text-decoration: none;
		border-radius: 6px;
		padding: 0.55rem 0.9rem;
		font-size: 0.82rem;
		font-weight: 600;
		transition: background 0.15s ease;
	}

	.sheet-link-btn:hover {
		background: #1e293b;
	}
</style>
