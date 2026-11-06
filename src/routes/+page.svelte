<script lang="ts">
	import { room12Date, canNavigate } from '../lib/recordRules';
	import { validateModule } from '../lib/validation';
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
	const todayStr = room12Date();

	// Top level state
	let activeTab = $state<'form' | 'history'>('form');
	let currentStep = $state<number>(1);
	let selectedDate = $state<string>(todayStr);
	let userInitials = $state<string>('');
	let isOnline = $state<boolean>(true);
	let isSubmitting = $state<boolean>(false);
	let submissionFeedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

	// Form datasets
	let lssData = $state<LSSData>({
		date: todayStr,
		amInitials: '',
		pmInitials: '',
		skimmerVenturi: '',
		skimmerSprayDown: '',
		filterCleaned: '',
		filterReplaced: '',
		waterLevelsAM: '',
		waterLevelsPM: '',
		waterFlowAM: '',
		waterFlowPM: '',
		airstonesAM: '',
		airstonesPM: '',
		vacNetTanks: '',
		tanksScrubbed: '',
		overflowCleaned: '',
		hoseFloorLadder: '',
		footTubLidsSqueegee: '',
		equipmentDisinfected: '',
		concerns: '',
		notes: ''
	});

	let tanksEggsData = $state<TanksEggsData>({
		date: todayStr,
		initials: '',
		palpationHO103: '',
		palpationHO102: '',
		palpationHO116: '',
		palpationHO105: '',
		palpationHO117: '',
		windEggs: '',
		newEggs: '',
		newEggTag: '',
		newEmbryos: '',
		candling: '',
		deadEggTag: '',
		foodRecordsEnteredPM: '',
		whatsappUpdateAM: '',
		whatsappUpdatePM: '',
		observationsNotes: '',
		moveDescription: '',
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
		tempA: '',
		tempB: '',
		pHA: '',
		pHB: '',
		salinityA: '',
		salinityB: '',
		doA: '',
		doB: '',
		notes: ''
	});

	let lssValid = $derived(validateModule('lss', lssData).length === 0);
	let tanksEggsValid = $derived(validateModule('tanksEggs', tanksEggsData).length === 0);
	let feedsValid = $derived(validateModule('feeds', feedsData).length === 0);
	let waterQualityValid = $derived(validateModule('waterQuality', waterQualityData).length === 0);

	onMount(() => {
		handleDateChange(room12Date());
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
			jumpToStep(currentStep + 1);
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
		if (!canNavigate(currentStep, step, [lssValid, tanksEggsValid, feedsValid, waterQualityValid])) return;
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
		const data = { lss: lssData, tanksEggs: tanksEggsData, feeds: feedsData, waterQuality: waterQualityData };
		if (isSubmitting || validateModule(module, data[module]).length) return;
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
	<!-- Navbar / Header with Physioshark & RummerLab branding -->
	<header class="site-header">
		<div class="header-container">
			<div class="brand-group">
				<a class="brand" href="/" aria-label="RummerLab Husbandry home">
					<img
						class="brand-logo"
						src="/rummerlab_logo_transparent.png"
						alt="RummerLab"
						height="38"
					/>
					<span class="badge-app">Husbandry</span>
				</a>
				<div class="room-pill">
					<span class="room-dot"></span>
					<span>Room 12 Records</span>
				</div>
			</div>

			<div class="nav-controls">
				<div class="network-badge" class:online={isOnline} class:offline={!isOnline}>
					<span class="status-dot"></span>
					<span>{isOnline ? 'Online' : 'Offline Mode'}</span>
				</div>

				<div class="nav-tabs" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'form'}
						class="nav-tab"
						class:active={activeTab === 'form'}
						onclick={() => (activeTab = 'form')}
					>
						📝 Enter Records
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'history'}
						class="nav-tab"
						class:active={activeTab === 'history'}
						onclick={() => (activeTab = 'history')}
					>
						📱 My Device History
					</button>
				</div>
			</div>
		</div>
		<div class="navy-bar"></div>
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
					/>
				{:else if currentStep === 2}
					<TanksEggsForm
						bind:data={tanksEggsData}
					/>
				{:else if currentStep === 3}
					<FeedsForm
						bind:data={feedsData}
					/>
				{:else if currentStep === 4}
					<WaterQualityForm
						bind:data={waterQualityData}
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
			<strong>RummerLab Room 12 Husbandry System</strong> • Physioshark / James Cook University
		</p>
		<p class="ethics-note">
			Animal Ethics Compliance & Strict Husbandry Records • Production: <code>husbandry.rummerlab.com</code>
		</p>
	</footer>
</div>

<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--page);
	}

	.site-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: #ffffff;
		box-shadow: 0 1px 3px rgba(16, 32, 56, 0.05);
	}

	.header-container {
		max-width: 1040px;
		margin: 0 auto;
		padding: 0.75rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.85rem;
	}

	.brand-group {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex-wrap: wrap;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		color: var(--ink);
	}

	.brand-logo {
		display: block;
		height: 38px;
		width: auto;
		object-fit: contain;
	}

	.badge-app {
		font-weight: 700;
		font-size: 0.76rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #ffffff;
		background: var(--accent);
		padding: 3px 8px;
		border-radius: 6px;
		box-shadow: 0 1px 2px rgba(29, 95, 184, 0.25);
	}

	.room-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.76rem;
		font-weight: 600;
		color: var(--ink-2);
		background: var(--surface-2);
		padding: 0.2rem 0.6rem;
		border-radius: 20px;
		border: 1px solid var(--hairline);
	}

	.room-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
	}

	.navy-bar {
		height: 4px;
		background: var(--navy);
		width: 100%;
	}

	.nav-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.network-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.65rem;
		border-radius: 20px;
		font-size: 0.76rem;
		font-weight: 600;
	}

	.network-badge.online {
		background: var(--good-bg);
		color: var(--good);
		border: 1px solid var(--good-border);
	}

	.network-badge.offline {
		background: var(--warn-bg);
		color: var(--warn);
		border: 1px solid var(--warn-border);
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
	}

	.network-badge.online .status-dot {
		background: var(--good);
	}

	.network-badge.offline .status-dot {
		background: var(--warn);
	}

	.nav-tabs {
		display: flex;
		gap: 0.3rem;
		background: var(--surface-2);
		padding: 0.25rem;
		border-radius: 8px;
		border: 1px solid var(--hairline);
	}

	.nav-tab {
		background: transparent;
		border: none;
		color: var(--ink-2);
		padding: 0.45rem 0.85rem;
		border-radius: 6px;
		font-size: 0.84rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.nav-tab:hover {
		color: var(--ink);
	}

	.nav-tab.active {
		background: #ffffff;
		color: var(--accent);
		box-shadow: 0 1px 3px rgba(16, 32, 56, 0.08);
	}

	.main-content {
		flex: 1;
		max-width: 1040px;
		width: 100%;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.feedback-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.9rem 1.25rem;
		border-radius: 8px;
		font-size: 0.92rem;
		font-weight: 500;
		box-shadow: var(--shadow);
	}

	.feedback-banner.success {
		background: var(--good-bg);
		border: 1.5px solid var(--good-border);
		color: var(--good);
	}

	.feedback-banner.error {
		background: var(--bad-bg);
		border: 1.5px solid var(--bad-border);
		color: var(--bad);
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
		background: var(--surface);
		border: 1px solid var(--hairline);
		border-radius: var(--radius);
		padding: 0.9rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.85rem;
		box-shadow: var(--shadow);
	}

	.session-input {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.86rem;
		font-weight: 600;
		color: var(--ink-2);
	}

	.session-input input {
		padding: 0.4rem 0.65rem;
		border: 1.5px solid var(--hairline);
		border-radius: 6px;
		font-size: 0.88rem;
		color: var(--ink);
		background: var(--surface);
		transition: border-color 0.15s;
		font-family: inherit;
	}

	.session-input input:focus {
		border-color: var(--accent);
		outline: none;
		box-shadow: 0 0 0 3px rgba(29, 95, 184, 0.12);
	}


	.stepper-nav {
		display: flex;
		gap: 0.6rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}

	.step-chip {
		flex: 1;
		min-width: 150px;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.7rem 0.95rem;
		background: var(--surface);
		border: 1.5px solid var(--hairline);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
		color: var(--muted);
		user-select: none;
		font-family: inherit;
	}

	.step-chip:hover {
		border-color: #cbd5e1;
		color: var(--ink-2);
	}

	.step-chip.active {
		border-color: var(--accent);
		background: var(--accent-wash);
		color: var(--accent-ink);
		box-shadow: 0 2px 6px rgba(29, 95, 184, 0.12);
		font-weight: 600;
	}

	.step-chip.complete {
		border-color: var(--good-border);
		color: var(--good);
		background: var(--good-bg);
	}

	.step-chip.complete.active {
		border-color: var(--accent);
		background: var(--accent-wash);
		color: var(--accent-ink);
	}

	.step-num {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--surface-2);
		color: var(--ink-2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.step-chip.active .step-num {
		background: var(--accent);
		color: #ffffff;
	}

	.step-chip.complete .step-num {
		background: var(--good);
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
		background: var(--surface);
		border: 1px solid var(--hairline);
		border-radius: var(--radius);
		padding: 0.9rem 1.35rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		bottom: 1rem;
		box-shadow: var(--shadow-lg);
		z-index: 40;
	}

	.step-indicator {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--ink-2);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.step-hint {
		color: var(--bad);
		font-size: 0.78rem;
		font-weight: 600;
	}

	.nav-action-btn {
		padding: 0.65rem 1.35rem;
		border-radius: 7px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.nav-action-btn.back {
		background: var(--surface-2);
		color: var(--ink-2);
	}

	.nav-action-btn.back:hover {
		background: #e2e8f0;
		color: var(--ink);
	}

	.nav-action-btn.next {
		background: var(--accent);
		color: #ffffff;
	}

	.nav-action-btn.next:hover:not(:disabled) {
		background: var(--accent-ink);
	}

	.nav-action-btn.submit {
		background: var(--good);
		color: #ffffff;
		box-shadow: 0 3px 8px rgba(10, 127, 46, 0.3);
	}

	.nav-action-btn.submit:hover:not(:disabled) {
		background: #086925;
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
		color: var(--muted);
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.sub-single-btn {
		background: var(--surface-2);
		border: 1px solid var(--hairline);
		color: var(--ink-2);
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.sub-single-btn:hover:not(:disabled) {
		background: #e2e8f0;
		color: var(--ink);
	}

	.sub-single-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.app-footer {
		background: var(--navy);
		color: var(--on-navy-2);
		padding: 2.25rem 1.25rem;
		text-align: center;
		font-size: 0.84rem;
		margin-top: auto;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.app-footer p {
		margin: 0.3rem 0;
	}

	.ethics-note {
		font-size: 0.78rem;
		color: #8d9aae;
	}

	.app-footer code {
		color: #7dd3fc;
		background: rgba(255, 255, 255, 0.06);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
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
		.room-pill {
			display: none;
		}
	}
</style>
