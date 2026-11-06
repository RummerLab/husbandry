<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		LSSData,
		TanksEggsData,
		FeedsData,
		WaterQualityData,
		FullHusbandrySubmission
	} from '../lib/types';
	import { getSavedInitials, setSavedInitials, saveLocalSubmission, getDeviceId } from '../lib/storage';
	import LSSForm from '../lib/components/LSSForm.svelte';
	import TanksEggsForm from '../lib/components/TanksEggsForm.svelte';
	import FeedsForm from '../lib/components/FeedsForm.svelte';
	import WaterQualityForm from '../lib/components/WaterQualityForm.svelte';
	import LocalHistoryView from '../lib/components/LocalHistoryView.svelte';

	// Today's date YYYY-MM-DD
	const todayStr = new Date().toISOString().split('T')[0];

	// Top level state
	let activeTab = $state<'form' | 'history'>('form');
	let wizardMode = $state<boolean>(true);
	let currentStep = $state<number>(1);
	let selectedDate = $state<string>(todayStr);
	let userInitials = $state<string>('');
	let isOnline = $state<boolean>(true);
	let isSubmitting = $state<boolean>(false);
	let submissionFeedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	// Validation states for each step
	let lssValid = $state<boolean>(false);
	let tanksEggsValid = $state<boolean>(false);
	let feedsValid = $state<boolean>(false);
	let waterQualityValid = $state<boolean>(false);

	// Form datasets
	let lssData = $state<LSSData>({
		date: todayStr,
		amInitials: '',
		pmInitials: '',
		skimmerVenturi: '/',
		skimmerSprayDown: '/',
		filterCleaned: 'Y',
		filterReplaced: '/',
		waterLevelsAM: 'Y',
		waterLevelsPM: 'Y',
		waterFlowAM: 'Y',
		waterFlowPM: 'Y',
		airstonesAM: 'Y',
		airstonesPM: 'Y',
		vacNetTanks: 'Y',
		tanksScrubbed: 'N',
		overflowCleaned: 'Y',
		hoseFloorLadder: 'Y',
		footTubLidsSqueegee: 'Y',
		equipmentDisinfected: 'Y',
		concerns: 'None',
		notes: ''
	});

	let tanksEggsData = $state<TanksEggsData>({
		date: todayStr,
		initials: '',
		palpationHO103: '0',
		palpationHO102: '0',
		palpationHO116: '0',
		palpationHO105: '0',
		palpationHO117: '0',
		windEggs: '0',
		newEggs: '0',
		newEggTag: '0',
		newEmbryos: 'N',
		candling: 'Y',
		deadEggTag: '0',
		foodRecordsEnteredPM: 'Y',
		whatsappUpdateAM: 'Y',
		whatsappUpdatePM: 'Y',
		observationsNotes: '',
		moveDescription: 'None',
		moveFrom: '',
		moveTo: '',
		moveQty: ''
	});

	let feedsData = $state<FeedsData>({
		date: todayStr,
		initials: '',
		tanks: {},
		notes: ''
	});

	let waterQualityData = $state<WaterQualityData>({
		date: todayStr,
		initials: '',
		isWeeklyCheck: false,
		tempA: '26.3',
		tempB: '26.2',
		pHA: '8.2',
		pHB: '8.2',
		salinityA: '36',
		salinityB: '36',
		doA: '/',
		doB: '/',
		notes: ''
	});

	onMount(() => {
		const saved = getSavedInitials();
		if (saved) {
			userInitials = saved;
			applyInitialsToAll(saved);
		}

		if (typeof window !== 'undefined') {
			isOnline = navigator.onLine;
			window.addEventListener('online', () => (isOnline = true));
			window.addEventListener('offline', () => (isOnline = false));
		}
	});

	function handleInitialsChange(val: string) {
		userInitials = val;
		setSavedInitials(val);
		applyInitialsToAll(val);
	}

	function handleDateChange(val: string) {
		selectedDate = val;
		lssData.date = val;
		tanksEggsData.date = val;
		feedsData.date = val;
		waterQualityData.date = val;
	}

	function applyInitialsToAll(initials: string) {
		if (!lssData.amInitials) lssData.amInitials = initials;
		if (!tanksEggsData.initials) tanksEggsData.initials = initials;
		if (!feedsData.initials) feedsData.initials = initials;
		if (!waterQualityData.initials) waterQualityData.initials = initials;
	}

	// Step validation logic: you cannot move forward if the current step is not valid
	let canAdvance = $derived.by(() => {
		if (currentStep === 1) return lssValid;
		if (currentStep === 2) return tanksEggsValid;
		if (currentStep === 3) return feedsValid;
		if (currentStep === 4) return waterQualityValid;
		return true;
	});

	function nextStep() {
		if (canAdvance && currentStep < 4) {
			currentStep++;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function jumpToStep(step: number) {
		currentStep = step;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function submitFullRoutine() {
		if (!lssValid || !tanksEggsValid || !feedsValid || !waterQualityValid) {
			submissionFeedback = {
				type: 'error',
				message: 'Cannot submit: please ensure all required questions across all 4 sections are answered.'
			};
			return;
		}

		isSubmitting = true;
		submissionFeedback = null;

		const submissionId = 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
		const payload: FullHusbandrySubmission = {
			id: submissionId,
			submittedAt: new Date().toISOString(),
			date: selectedDate,
			initials: userInitials || lssData.amInitials || 'Lab Member',
			modulesSubmitted: ['lss', 'tanksEggs', 'feeds', 'waterQuality'],
			lss: $state.snapshot(lssData),
			tanksEggs: $state.snapshot(tanksEggsData),
			feeds: $state.snapshot(feedsData),
			waterQuality: $state.snapshot(waterQualityData),
			clientDeviceId: getDeviceId()
		};

		let syncSuccess = false;
		let responseMessage = '';

		if (isOnline) {
			try {
				const res = await fetch('/api/submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				const result = await res.json();
				if (result.success) {
					syncSuccess = true;
					responseMessage = result.message || 'Synced to Google Sheets!';
				} else {
					responseMessage = result.error || 'Server rejected submission';
				}
			} catch (err) {
				responseMessage = 'Network error during sync, saved offline.';
			}
		} else {
			responseMessage = 'Saved to offline device queue. Will auto-sync when reconnected.';
		}

		// Save to local device history
		saveLocalSubmission({
			id: submissionId,
			submittedAt: payload.submittedAt,
			date: payload.date,
			initials: payload.initials,
			modules: payload.modulesSubmitted,
			synced: syncSuccess,
			syncError: syncSuccess ? undefined : responseMessage,
			summary: `Complete Room 12 Routine (LSS, Tanks & Eggs, Feeds, Water Quality)`,
			payload
		});

		isSubmitting = false;
		submissionFeedback = {
			type: 'success',
			message: syncSuccess
				? `🎉 Success! All data recorded and updated in Google Sheets.`
				: `📦 Saved locally to this device! ${responseMessage}`
		};

		// Reset or remain on page with clear notice
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function submitSingleModule(module: 'lss' | 'tanksEggs' | 'feeds' | 'waterQuality') {
		isSubmitting = true;
		submissionFeedback = null;

		const submissionId = 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
		const payload: FullHusbandrySubmission = {
			id: submissionId,
			submittedAt: new Date().toISOString(),
			date: selectedDate,
			initials: userInitials || 'Lab Member',
			modulesSubmitted: [module],
			clientDeviceId: getDeviceId()
		};

		if (module === 'lss') payload.lss = $state.snapshot(lssData);
		if (module === 'tanksEggs') payload.tanksEggs = $state.snapshot(tanksEggsData);
		if (module === 'feeds') payload.feeds = $state.snapshot(feedsData);
		if (module === 'waterQuality') payload.waterQuality = $state.snapshot(waterQualityData);

		let syncSuccess = false;
		let responseMessage = '';

		if (isOnline) {
			try {
				const res = await fetch('/api/submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				const result = await res.json();
				if (result.success) {
					syncSuccess = true;
					responseMessage = result.message || 'Synced to Google Sheets!';
				} else {
					responseMessage = result.error || 'Server error';
				}
			} catch (err) {
				responseMessage = 'Network error, saved to device.';
			}
		}

		saveLocalSubmission({
			id: submissionId,
			submittedAt: payload.submittedAt,
			date: payload.date,
			initials: payload.initials,
			modules: [module],
			synced: syncSuccess,
			syncError: syncSuccess ? undefined : responseMessage,
			summary: `Single Module: ${module.toUpperCase()}`,
			payload
		});

		isSubmitting = false;
		submissionFeedback = {
			type: 'success',
			message: syncSuccess
				? `✓ ${module.toUpperCase()} submitted and updated in Google Sheets.`
				: `Saved to device queue: ${responseMessage}`
		};
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<div class="app-layout">
	<!-- Navbar / Header -->
	<header class="top-nav">
		<div class="nav-brand">
			<div class="brand-badge">🦈</div>
			<div>
				<h1 class="brand-title">RummerLab Husbandry</h1>
				<p class="brand-subtitle">Room 12 Records • Dr Jodie Rummer Lab</p>
			</div>
		</div>

		<div class="nav-controls">
			<div class="network-badge" class:online={isOnline} class:offline={!isOnline}>
				<span class="status-dot"></span>
				<span>{isOnline ? 'Online' : 'Offline Mode'}</span>
			</div>

			<div class="nav-tabs">
				<button
					type="button"
					class="nav-tab"
					class:active={activeTab === 'form'}
					onclick={() => (activeTab = 'form')}
				>
					📝 Enter Records
				</button>
				<button
					type="button"
					class="nav-tab"
					class:active={activeTab === 'history'}
					onclick={() => (activeTab = 'history')}
				>
					📱 My Device History
				</button>
			</div>
		</div>
	</header>

	<main class="main-content">
		{#if submissionFeedback}
			<div class="feedback-banner {submissionFeedback.type}">
				<div class="feedback-text">{submissionFeedback.message}</div>
				<button
					type="button"
					class="feedback-close"
					onclick={() => (submissionFeedback = null)}
				>
					✕
				</button>
			</div>
		{/if}

		{#if activeTab === 'history'}
			<LocalHistoryView />
		{:else}
			<!-- Quick Session Settings -->
			<div class="session-bar">
				<div class="session-input">
					<label for="record-date">Date of Records:</label>
					<input
						id="record-date"
						type="date"
						value={selectedDate}
						onchange={(e) => handleDateChange(e.currentTarget.value)}
					/>
				</div>

				<div class="session-input">
					<label for="team-initials">Your Initials (Saved):</label>
					<input
						id="team-initials"
						type="text"
						placeholder="e.g. SE + AC"
						value={userInitials}
						oninput={(e) => handleInitialsChange(e.currentTarget.value)}
					/>
				</div>

				<div class="workflow-toggle">
					<label>
						<input type="checkbox" bind:checked={wizardMode} />
						<span>Guided Wizard (Step-by-Step)</span>
					</label>
				</div>
			</div>

			<!-- Stepper / Module Nav -->
			<nav class="stepper-nav" aria-label="Husbandry Sections">
				<button
					type="button"
					class="step-chip"
					class:active={currentStep === 1}
					class:complete={lssValid}
					onclick={() => jumpToStep(1)}
				>
					<span class="step-num">{lssValid ? '✓' : '1'}</span>
					<span class="step-label">LSS Checks</span>
				</button>

				<button
					type="button"
					class="step-chip"
					class:active={currentStep === 2}
					class:complete={tanksEggsValid}
					onclick={() => jumpToStep(2)}
				>
					<span class="step-num">{tanksEggsValid ? '✓' : '2'}</span>
					<span class="step-label">Tanks + Eggs</span>
				</button>

				<button
					type="button"
					class="step-chip"
					class:active={currentStep === 3}
					class:complete={feedsValid}
					onclick={() => jumpToStep(3)}
				>
					<span class="step-num">{feedsValid ? '✓' : '3'}</span>
					<span class="step-label">Feeds</span>
				</button>

				<button
					type="button"
					class="step-chip"
					class:active={currentStep === 4}
					class:complete={waterQualityValid}
					onclick={() => jumpToStep(4)}
				>
					<span class="step-num">{waterQualityValid ? '✓' : '4'}</span>
					<span class="step-label">Water Quality</span>
				</button>
			</nav>

			<!-- Active Step Content -->
			<div class="step-content">
				{#if currentStep === 1}
					<LSSForm
						bind:data={lssData}
						onValidChange={(val: boolean) => (lssValid = val)}
					/>
				{:else if currentStep === 2}
					<TanksEggsForm
						bind:data={tanksEggsData}
						onValidChange={(val: boolean) => (tanksEggsValid = val)}
					/>
				{:else if currentStep === 3}
					<FeedsForm
						bind:data={feedsData}
						onValidChange={(val: boolean) => (feedsValid = val)}
					/>
				{:else if currentStep === 4}
					<WaterQualityForm
						bind:data={waterQualityData}
						onValidChange={(val: boolean) => (waterQualityValid = val)}
					/>
				{/if}
			</div>

			<!-- Stepper Navigation Bar -->
			<div class="step-nav-footer">
				<div class="left-action">
					{#if currentStep > 1}
						<button type="button" class="nav-action-btn back" onclick={prevStep}>
							← Previous Step
						</button>
					{/if}
				</div>

				<div class="step-indicator">
					Step {currentStep} of 4
					{#if !canAdvance}
						<span class="step-hint">• Required fields pending</span>
					{/if}
				</div>

				<div class="right-action">
					{#if currentStep < 4}
						<button
							type="button"
							class="nav-action-btn next"
							class:disabled={!canAdvance}
							disabled={!canAdvance}
							onclick={nextStep}
						>
							Next Step →
						</button>
					{:else}
						<button
							type="button"
							class="nav-action-btn submit"
							class:disabled={!canAdvance || isSubmitting}
							disabled={!canAdvance || isSubmitting}
							onclick={submitFullRoutine}
						>
							{isSubmitting ? 'Submitting...' : '🚀 Submit All to Google Sheets'}
						</button>
					{/if}
				</div>
			</div>

			<!-- Quick individual module submission option -->
			<div class="single-module-panel">
				<span>Or submit only this section individually:</span>
				<button
					type="button"
					class="sub-single-btn"
					disabled={!canAdvance || isSubmitting}
					onclick={() => {
						if (currentStep === 1) submitSingleModule('lss');
						if (currentStep === 2) submitSingleModule('tanksEggs');
						if (currentStep === 3) submitSingleModule('feeds');
						if (currentStep === 4) submitSingleModule('waterQuality');
					}}
				>
					Save only Step {currentStep} to Sheets
				</button>
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="app-footer">
		<p>
			<strong>RummerLab Room 12 Husbandry System</strong> • James Cook University / Physioshark
		</p>
		<p class="ethics-note">
			Animal Ethics Compliance & Strict Husbandry Records • Domain: <code>husbandry.rummerlab.com</code>
		</p>
	</footer>
</div>

<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.top-nav {
		background: #0369a1;
		color: #ffffff;
		padding: 0.85rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.brand-badge {
		font-size: 1.8rem;
		background: rgba(255, 255, 255, 0.15);
		width: 44px;
		height: 44px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.brand-title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.brand-subtitle {
		margin: 0.1rem 0 0;
		font-size: 0.78rem;
		opacity: 0.9;
	}

	.nav-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.network-badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
		border-radius: 20px;
		font-size: 0.74rem;
		font-weight: 600;
	}

	.network-badge.online {
		background: #059669;
		color: #ecfdf5;
	}

	.network-badge.offline {
		background: #d97706;
		color: #fffbeb;
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #ffffff;
	}

	.nav-tabs {
		display: flex;
		gap: 0.35rem;
		background: rgba(0, 0, 0, 0.15);
		padding: 0.25rem;
		border-radius: 8px;
	}

	.nav-tab {
		background: transparent;
		border: none;
		color: #e0f2fe;
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.nav-tab.active {
		background: #ffffff;
		color: #0369a1;
	}

	.main-content {
		flex: 1;
		max-width: 960px;
		width: 100%;
		margin: 0 auto;
		padding: 1.25rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.feedback-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.85rem 1.1rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 500;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
	}

	.feedback-banner.success {
		background: #f0fdf4;
		border: 1.5px solid #86efac;
		color: #166534;
	}

	.feedback-banner.error {
		background: #fef2f2;
		border: 1.5px solid #fca5a5;
		color: #991b1b;
	}

	.feedback-close {
		background: transparent;
		border: none;
		font-size: 1.1rem;
		cursor: pointer;
		color: inherit;
		opacity: 0.7;
	}

	.session-bar {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		padding: 0.85rem 1.1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.85rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.session-input {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: #334155;
	}

	.session-input input {
		padding: 0.35rem 0.6rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 6px;
		font-size: 0.85rem;
		color: #1e293b;
	}

	.workflow-toggle label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: #475569;
		cursor: pointer;
	}

	.stepper-nav {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}

	.step-chip {
		flex: 1;
		min-width: 140px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0.85rem;
		background: #ffffff;
		border: 1.5px solid #e2e8f0;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
		color: #64748b;
		user-select: none;
	}

	.step-chip.active {
		border-color: #0284c7;
		background: #f0f9ff;
		color: #0369a1;
		box-shadow: 0 2px 5px rgba(2, 132, 199, 0.15);
	}

	.step-chip.complete {
		border-color: #86efac;
		color: #166534;
	}

	.step-chip.complete.active {
		border-color: #0284c7;
		background: #f0f9ff;
	}

	.step-num {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: #e2e8f0;
		color: #475569;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.step-chip.active .step-num {
		background: #0284c7;
		color: #ffffff;
	}

	.step-chip.complete .step-num {
		background: #16a34a;
		color: #ffffff;
	}

	.step-label {
		font-size: 0.88rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.step-content {
		margin-top: 0.25rem;
	}

	.step-nav-footer {
		background: #ffffff;
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		padding: 0.85rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		bottom: 1rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
		z-index: 50;
	}

	.step-indicator {
		font-size: 0.88rem;
		font-weight: 600;
		color: #475569;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.step-hint {
		color: #dc2626;
		font-size: 0.78rem;
		font-weight: 500;
	}

	.nav-action-btn {
		padding: 0.65rem 1.25rem;
		border-radius: 7px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all 0.15s ease;
	}

	.nav-action-btn.back {
		background: #f1f5f9;
		color: #334155;
	}

	.nav-action-btn.back:hover {
		background: #e2e8f0;
	}

	.nav-action-btn.next {
		background: #0284c7;
		color: #ffffff;
	}

	.nav-action-btn.next:hover:not(:disabled) {
		background: #0369a1;
	}

	.nav-action-btn.submit {
		background: #16a34a;
		color: #ffffff;
		box-shadow: 0 3px 8px rgba(22, 163, 74, 0.35);
	}

	.nav-action-btn.submit:hover:not(:disabled) {
		background: #15803d;
	}

	.nav-action-btn.disabled,
	.nav-action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		box-shadow: none;
	}

	.single-module-panel {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.82rem;
		color: #64748b;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.sub-single-btn {
		background: #e2e8f0;
		border: 1px solid #cbd5e1;
		color: #334155;
		padding: 0.3rem 0.65rem;
		border-radius: 5px;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.sub-single-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.app-footer {
		background: #0f172a;
		color: #94a3b8;
		padding: 1.5rem 1rem;
		text-align: center;
		font-size: 0.8rem;
		margin-top: auto;
	}

	.app-footer p {
		margin: 0.2rem 0;
	}

	.ethics-note {
		font-size: 0.75rem;
		color: #64748b;
	}

	.app-footer code {
		color: #38bdf8;
	}

	@media (max-width: 640px) {
		.step-label {
			display: none;
		}
		.step-chip {
			min-width: 48px;
			justify-content: center;
			padding: 0.5rem;
		}
		.step-indicator {
			font-size: 0.78rem;
		}
	}
</style>
