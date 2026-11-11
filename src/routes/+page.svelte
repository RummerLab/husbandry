<script lang="ts">
	import { shifts, stepLabels, stepModule, createEntryPayload, createEmptyStepForms, resetSubmittedSteps, rollPristineDrafts, stepValid, type Shift, type Step, type StepForms, type Room6Section, ROOM6_SECTIONS } from '../lib/shiftWorkflow';
	import { createSubmissionFeedback } from '../lib/submissionFeedback';
	import { prepareSave, type SaveState } from '../lib/saveState';
	import { destinationForTab, destinationTab, shiftDestination, type EntryDestination } from '../lib/entryDestination';
	import { readQueueSnapshot, observeDeviceQueue } from '../lib/queueSnapshot';
	import { startAutoSync } from '../lib/autoSync';
	import { room12Date, canNavigate, isOffDay, waterQualitySavedOn, brisbaneTime } from '../lib/recordRules';
	import { getModuleIssues, validateModule } from '../lib/validation';
	import { markInvalidFields, focusFirstInvalidField } from '../lib/validationGuide';
	import { describeWaterQualityIssue, sortWaterQualityIssues } from '../lib/waterQualityGuide';
	import { visibleModuleIssues, type ValidationFeedback } from '../lib/validationFeedback';
	import { onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type {
		LSSData,
		TanksEggsData,
		FeedsData,
		WaterQualityData,
		Room6EggChecksData,
		Room6WaterQualityData,
		Room6LssData,
		Room6AmmoniaData,
		FullHusbandrySubmission
	} from '../lib/types';
	import { getSavedInitials, setSavedInitials, persistNewSubmission, syncPendingSubmissions, getLocalHistory } from '../lib/storage';
	import { parseHomeTab, createHomeTabObserver, homeTabUrl, roomForTab, type HomeTab, type RecordingRoom, type Room12Tab } from '../lib/homeTab';
	import LSSForm from '../lib/components/LSSForm.svelte';
	import TanksEggsForm from '../lib/components/TanksEggsForm.svelte';
	import FeedsForm from '../lib/components/FeedsForm.svelte';
	import WaterQualityForm from '../lib/components/WaterQualityForm.svelte';
	import Room6EggChecksForm from '../lib/components/Room6EggChecksForm.svelte';
	import Room6WaterQualityForm from '../lib/components/Room6WaterQualityForm.svelte';
	import Room6LssForm from '../lib/components/Room6LssForm.svelte';
	import Room6AmmoniaForm from '../lib/components/Room6AmmoniaForm.svelte';
	import LocalHistoryView from '../lib/components/LocalHistoryView.svelte';
	import IosInstallHint from '../lib/components/IosInstallHint.svelte';
	import SiteHeader from '../lib/components/SiteHeader.svelte';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let tabUrl = $derived(homeTabUrl(page));

	// Today's date YYYY-MM-DD
	const todayStr = room12Date();

	// Top level state
	const initialSearch = homeTabUrl(page).search;
	const initialTab = parseHomeTab(initialSearch) ?? 'morning';
	let destination = $state<EntryDestination>(destinationForTab(initialTab));
	let activeTab = $derived(destinationTab(destination));
	let selectedRoom = $state<RecordingRoom>(roomForTab(initialTab) ?? 'room12');
	let lastRoom12Tab = $state<Room12Tab>(initialTab !== 'room6' && initialTab !== 'history' ? initialTab : 'morning');
	let lastRoom6Section = $state<Room6Section>('room6Eggs');
	let currentStep = $derived(destination.kind === 'shift' ? destination.step : 1);
	let validationRoot = $state<HTMLElement>();
	let validationFeedback = $state<ValidationFeedback>('pristine');
	let showValidation = $derived(validationFeedback === 'revealed');
	let feedbackBanner = $state<HTMLDivElement>();
	let selectedShift = $derived<Shift>(destination.kind === 'shift' ? destination.shift : 'morning');
	let shiftSteps: Step[] = $derived(shifts[selectedShift].steps);
	let activeStep = $derived(shiftSteps[currentStep - 1]);
	const shiftIntro: Record<Shift, { title: string; text: string }> = {
		morning: { title: 'AM shift — LSS + Water Quality', text: 'Record the daily animal welfare check and AM tank checks, then water quality when due (at least every second day). If water quality is not due, save AM LSS alone. Filters, skimmer and hygiene are recorded by the PM shift.' },
		noon: { title: 'PM shift — LSS, Eggs + Feeds', text: 'Record the PM tank checks, filters, skimmer and hygiene, then Tanks + Eggs and Feeds. If you only did the PM checks, save PM LSS alone. The AM shift records its own checks.' },
		offDay: { title: 'Off-day check (Tue, Thu, Sat, Sun)', text: 'The daily minimum: the animal welfare check and AM tank checks, then water quality if it is due. Filters, skimmer and hygiene are not required on off-days.' }
	};
	let userInitials = $state<string>('');
	let isOnline = $state<boolean>(true);
	let saveState = $state<SaveState>({ kind: 'editing' });
	let isSubmitting = $derived(saveState.kind === 'persisting');
	let receipt = $state<{ id: string; submittedAll: boolean } | null>(null);
	let submissionFeedback = $state<{ type: 'success' | 'pending' | 'error'; message: string } | null>(null);

	// Form datasets
	const initialForms = createEmptyStepForms(todayStr);
	// AM and PM LSS are separate drafts so each shift saves only its own half of the LSS sheet.
	let lssAmData = $state<LSSData>(initialForms.lssAM);
	let lssPmData = $state<LSSData>(initialForms.lssPM);

	let tanksEggsData = $state<TanksEggsData>(initialForms.tanksEggs);

	let feedsData = $state<FeedsData>(initialForms.feeds);

	let waterQualityData = $state<WaterQualityData>(initialForms.waterQuality);

	// Room 6 sections (#99), each saved on its own to its workbook-matching sheet tab.
	let room6EggsData = $state<Room6EggChecksData>(initialForms.room6Eggs);
	let room6WaterQualityData = $state<Room6WaterQualityData>(initialForms.room6WaterQuality);
	let room6LssData = $state<Room6LssData>(initialForms.room6Lss);
	let room6AmmoniaData = $state<Room6AmmoniaData>(initialForms.room6Ammonia);
	let room6Section = $derived(destination.kind === 'room6' ? destination.section : 'room6Eggs');

	let forms: StepForms = $derived({
		lssAM: lssAmData, lssPM: lssPmData, tanksEggs: tanksEggsData, feeds: feedsData, waterQuality: waterQualityData,
		room6Eggs: room6EggsData, room6WaterQuality: room6WaterQualityData, room6Lss: room6LssData, room6Ammonia: room6AmmoniaData
	});
	let stepValidity = $derived(shiftSteps.map(step => stepValid(step, forms)));
	let contextSteps: Step[] = $derived(activeTab === 'waterQuality' ? ['waterQuality'] : activeTab === 'room6' ? [room6Section] : shiftSteps);
	let selectedDate = $derived(forms[contextSteps[0]].date);
	let mismatchedDates = $derived(contextSteps.some(step => forms[step].date !== selectedDate));
	let offDay = $derived(isOffDay(selectedDate));

	let waterQualityValid = $derived(validateModule('waterQuality', waterQualityData).length === 0);
	let room6Valid = $derived(stepValid(room6Section, forms));

	onMount(() => {
		// Every draft is still empty at mount, so all workflows start on today's Brisbane date.
		for (const step of Object.keys(forms) as Step[]) forms[step].date = room12Date();
		// Off-days open on the Off-day tab so volunteers see only the daily minimum,
		// unless a deep link (/?tab=…) asked for a specific tab.
		if (isOffDay(selectedDate) && !parseHomeTab(tabUrl.search)) selectTab('offDay');
		try {
			const saved = getSavedInitials();
			if (saved) { userInitials = saved; applyInitialsToAll(saved); }
		} catch { submissionFeedback = { type: 'error', message: 'Device storage is unavailable. Keep this form open until saving succeeds.' }; }
		const stop = startAutoSync(online => { isOnline = online; refreshPending(); }, error => { submissionFeedback = { type: 'error', message: String(error) }; });
		const stopObserving = observeDeviceQueue(refreshPending);
		return () => { stop(); stopObserving(); };
	});

	function handleInitialsChange(val: string) {
		userInitials = val;
		try { setSavedInitials(val); } catch { submissionFeedback = { type: 'error', message: 'Cannot save preferences: device storage unavailable.' }; }
		applyInitialsToAll(val);
	}

	function handleDateChange(val: string) {
		for (const step of contextSteps) forms[step].date = val;
	}

	function applyInitialsToAll(initials: string) {
		if (!lssAmData.amInitials) lssAmData.amInitials = initials;
		if (!lssPmData.pmInitials) lssPmData.pmInitials = initials;
		if (!tanksEggsData.initials) tanksEggsData.initials = initials;
		if (!feedsData.initials) feedsData.initials = initials;
		if (!waterQualityData.initials) waterQualityData.initials = initials;
		for (const room6 of [room6EggsData, room6WaterQualityData, room6LssData, room6AmmoniaData]) if (!room6.initials) room6.initials = initials;
	}

	// Step validation logic: you cannot move forward if the current step is not valid
	let canAdvance = $derived(stepValidity[currentStep - 1]);
	let shiftValid = $derived(stepValidity.every(Boolean) && !mismatchedDates);

	let activeIssues = $derived(activeTab === 'waterQuality'
		? getModuleIssues('waterQuality', waterQualityData)
		: activeTab === 'room6'
			? getModuleIssues(stepModule[room6Section], forms[room6Section])
			: getModuleIssues(stepModule[activeStep], forms[activeStep]));
	// The Water Quality tab also flags values already typed but invalid (e.g. "98%"), before Save is tried.
	let visibleIssues = $derived(visibleModuleIssues(validationFeedback, activeIssues, waterQualityData, activeTab === 'waterQuality'));
	$effect(() => {
		if (validationRoot) markInvalidFields(validationRoot, visibleIssues);
	});

	async function nextStep() {
		if (isSubmitting) return;
		if (!canAdvance) {
			validationFeedback = 'revealed';
			await tick();
			if (validationRoot) focusFirstInvalidField(validationRoot);
			return;
		}
		if (currentStep < shiftSteps.length) jumpToStep(currentStep + 1);
	}

	function applyTab(tab: HomeTab) {
		if (isSubmitting) return;
		validationFeedback = 'pristine';
		destination = destinationForTab(tab, lastRoom6Section);
		const room = roomForTab(tab);
		if (room) selectedRoom = room;
		if (room === 'room12') lastRoom12Tab = tab as Room12Tab;
	}

	async function selectTab(tab: HomeTab) {
		if (isSubmitting) return;
		applyTab(tab);
		const next = new URL(tabUrl.href);
		if (next.searchParams.get('tab') !== tab) {
			next.searchParams.set('tab', tab);
			try {
				await goto(`${next.pathname}${next.search}${next.hash}`, { state: page.state, shallow: true, replace: true, reset: false });
			} catch {
				// URL synchronisation must not undo an immediate tab switch or discard drafts.
			}
		}
	}

	// URL -> view is separate from clicks -> URL. Never react to activeTab against an old URL (#98).
	const observeTabUrl = createHomeTabObserver(initialSearch, applyTab);
	$effect(() => {
		const search = tabUrl.search;
		untrack(() => observeTabUrl(search));
	});


	/** Save stays disabled while invalid; this reveals and focuses what is missing instead. */
	async function revealModuleIssues() {
		validationFeedback = 'revealed';
		await tick();
		if (validationRoot) focusFirstInvalidField(validationRoot);
	}

	function prevStep() {
		if (currentStep > 1) {
			validationFeedback = 'pristine';
			destination = shiftDestination(selectedShift, currentStep - 1);
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function jumpToStep(step: number) {
		if (!canNavigate(currentStep, step, stepValidity)) return;
		validationFeedback = 'pristine';
		destination = shiftDestination(selectedShift, step);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function submitSteps(steps: Step[]) {
		if (isSubmitting) return;
		try {
			const candidate = createEntryPayload(steps, $state.snapshot(forms), selectedDate, userInitials);
			saveState = prepareSave(saveState, candidate);
			submissionFeedback = null;
			receipt = null;
			await persistSubmission(saveState.payload, steps);
		} catch (error) {
			// Drop any earlier receipt so a queue refresh cannot replace this error with an old success.
			receipt = null;
			submissionFeedback = { type: 'error', message: error instanceof Error ? error.message : String(error) };
		}
	}

	async function persistSubmission(payload: FullHusbandrySubmission, steps: Step[]) {
		try {
			const record = persistNewSubmission(payload);
			saveState = { kind: 'durable', id: record.id };
			const submittedPair = steps.length > 1;
			// Only the newly empty submitted drafts roll forward. Other dates/answers stay intact.
			let fresh = resetSubmittedSteps(forms, steps, submittedPair ? room12Date() : selectedDate, userInitials);
			// Untouched drafts in other workflows also follow a pair save's rollover (shared tablets left open overnight).
			if (submittedPair) fresh = rollPristineDrafts(fresh, room12Date(), userInitials);
			lssAmData = fresh.lssAM;
			lssPmData = fresh.lssPM;
			tanksEggsData = fresh.tanksEggs;
			feedsData = fresh.feeds;
			waterQualityData = fresh.waterQuality;
			room6EggsData = fresh.room6Eggs;
			room6WaterQualityData = fresh.room6WaterQuality;
			room6LssData = fresh.room6Lss;
			room6AmmoniaData = fresh.room6Ammonia;
			if (destination.kind === 'shift') destination = shiftDestination(selectedShift);
			// Stay in the selected workflow; unsent sections retain their answers.
			validationFeedback = 'pristine';
			submissionFeedback = createSubmissionFeedback(record, submittedPair);
			receipt = { id: record.id, submittedAll: submittedPair };
			if (isOnline) void syncPendingSubmissions().catch(() => refreshPending());
		} catch (error) {
			const message = `Could not confirm saving. Keep this form open. ${error instanceof Error ? error.message : 'Storage unavailable'}`;
			if (saveState.kind !== 'durable') saveState = { kind: 'failed', payload, message };
			submissionFeedback = { type: 'error', message };
		} finally {
			refreshPending();
			await tick();
			feedbackBanner?.focus({ preventScroll: true });
			window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
		}
	}

	let pendingCount = $state<number | null>(null);
	let deviceHistory = $state<ReturnType<typeof getLocalHistory>>([]);
	// #58: warn (never block) when this device already saved Water Quality for the record date.
	let earlierWaterQuality = $derived(waterQualitySavedOn(deviceHistory, selectedDate));
	let earlierWaterQualityBy = $derived(earlierWaterQuality?.payload.waterQuality?.initials || '');
	function refreshPending() {
		const snapshot = readQueueSnapshot();
		if (snapshot.kind === 'unavailable') {
			pendingCount = null;
			submissionFeedback = { type: 'error', message: snapshot.message };
			return;
		}
		deviceHistory = snapshot.records;
		pendingCount = snapshot.pendingCount;
		const record = receipt && snapshot.records.find(record => record.id === receipt?.id);
		if (record && receipt) submissionFeedback = createSubmissionFeedback(record, receipt.submittedAll);
	}

</script>

{#snippet duplicateWaterQualityNotice(inRoutine: boolean)}
	{#if earlierWaterQuality}
		<aside class="duplicate-wq-notice" role="note" aria-label="Water Quality already saved for this date">
			<strong>Water Quality already saved for this date</strong>
			<p>
				This device saved Water Quality for {selectedDate}{brisbaneTime(earlierWaterQuality.submittedAt) ? ` at ${brisbaneTime(earlierWaterQuality.submittedAt)}` : ''}{earlierWaterQualityBy ? ` (${earlierWaterQualityBy})` : ''}.
				Saving again adds a second Water Quality row for {selectedDate}. Only continue if this is a new set of readings.
				{#if inRoutine}If these readings are already recorded, save AM LSS alone with <em>Save only AM LSS to Sheets</em>.{/if}
			</p>
		</aside>
	{/if}
{/snippet}

{#snippet sessionBar()}
	<!-- Quick Session Settings -->
	<div class="session-bar">
		<div class="session-input">
			<label for="record-date">Date of Records:</label>
			<input
				id="record-date"
				data-field="date"
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
	{#if mismatchedDates}
		<div role="status">
			<p>This workflow has drafts for different dates ({[...new Set(contextSteps.map(step => forms[step].date))].join(', ')}). Other workflows retain their own dates.</p>
			<button type="button" class="show-missing-btn" onclick={() => handleDateChange(selectedDate)}>Use {selectedDate} for these sections</button>
		</div>
	{/if}
{/snippet}

<div class="app-layout">
	<SiteHeader room={selectedRoom} room12Tab={lastRoom12Tab} highlight={activeTab} {isOnline} {pendingCount} onSelectTab={selectTab} />

	<main class="main-content" bind:this={validationRoot}>
		<IosInstallHint />
		{#if submissionFeedback}
			<div class="feedback-banner {submissionFeedback.type}" role={submissionFeedback.type === 'error' ? 'alert' : 'status'} tabindex="-1" bind:this={feedbackBanner}>
				<div class="feedback-text">{submissionFeedback.message}</div>
				<button
					type="button"
					class="feedback-close"
					onclick={() => { submissionFeedback = null; receipt = null; }}
				>
					✕
				</button>
			</div>
		{/if}

		{#if activeTab === 'history'}
			<LocalHistoryView masterSpreadsheetUrl={data.masterSpreadsheetUrl} />
		{:else if activeTab === 'waterQuality'}
			<fieldset class="entry-form" disabled={isSubmitting} aria-busy={isSubmitting}>
				{@render sessionBar()}

				<div class="wq-only-intro">
					<strong>Water Quality only</strong>
					<span>Use this tab when routine water quality (at least every second day) or weekly chemistry is the only task you're recording. It saves a row to the <em>Water Quality</em> sheet without the daily LSS, Tanks + Eggs or Feeds sections.</span>
				</div>

				{#if visibleIssues.length}
					<div id="step-validation-summary" class="validation-summary" role={showValidation ? 'alert' : 'status'}>
						<p>{showValidation ? `Complete or correct the highlighted answers before saving (${visibleIssues.length} remaining):` : 'Check these values:'}</p>
						<ul>
							{#each sortWaterQualityIssues(visibleIssues) as issue (issue.field)}
								<li>{describeWaterQualityIssue(issue)}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{@render duplicateWaterQualityNotice(false)}

				<div class="step-content">
					<WaterQualityForm bind:data={waterQualityData} />
				</div>

				<div class="step-nav-footer wq-footer">
					<div class="step-indicator">
						Water Quality
						{#if !waterQualityValid}
							<span class="step-hint" id="wq-save-help">• Save unlocks when every required field (*) is valid</span>
							<button type="button" class="show-missing-btn" onclick={revealModuleIssues}>Show what's missing</button>
						{/if}
					</div>
					<div class="right-action">
						<button
							type="button"
							class="nav-action-btn submit"
							class:disabled={!waterQualityValid || isSubmitting}
							disabled={!waterQualityValid || isSubmitting}
							aria-describedby={!waterQualityValid ? 'wq-save-help' : undefined}
							onclick={() => submitSteps(['waterQuality'])}
						>
							{isSubmitting ? 'Saving...' : '💧 Save Water Quality to Sheets'}
						</button>
					</div>
				</div>

				<div class="lab-records-panel">
					<span>Need to compare with other days or other people's readings?</span>
					{#if data.masterSpreadsheetUrl}
						<a href={data.masterSpreadsheetUrl} target="_blank" rel="noopener noreferrer" class="lab-records-link">
							View all lab records (master spreadsheet, read-only) ↗
						</a>
					{:else}
						<span>Master spreadsheet link unavailable. Please contact the lab administrator.</span>
					{/if}
				</div>
			</fieldset>
		{:else if activeTab === 'room6'}
			<fieldset class="entry-form" disabled={isSubmitting} aria-busy={isSubmitting}>
				{@render sessionBar()}

				<div class="wq-only-intro">
					<strong>Room 6 (egg room)</strong>
					<span>Choose what you are recording. Each section saves on its own to its Room 6 sheet, separate from the Room 12 records; answers in other sections are kept.</span>
				</div>

				<div class="room6-sections" role="group" aria-label="Room 6 record">
					{#each ROOM6_SECTIONS as section (section.step)}
						<button type="button" class="room6-section" class:active={room6Section === section.step} aria-pressed={room6Section === section.step} onclick={() => { lastRoom6Section = section.step; destination = { kind: 'room6', section: section.step }; validationFeedback = 'pristine'; }}>
							<strong>{section.label}</strong>
							<span>{section.hint}</span>
						</button>
					{/each}
				</div>

				{#if showValidation && activeIssues.length}
					<p id="step-validation-summary" class="validation-summary" role="alert">
						Complete the highlighted answers before saving ({activeIssues.length} remaining).
					</p>
				{/if}

				<div class="step-content">
					{#if room6Section === 'room6Eggs'}
						<Room6EggChecksForm bind:data={room6EggsData} />
					{:else if room6Section === 'room6WaterQuality'}
						<Room6WaterQualityForm bind:data={room6WaterQualityData} />
					{:else if room6Section === 'room6Lss'}
						<Room6LssForm bind:data={room6LssData} />
					{:else}
						<Room6AmmoniaForm bind:data={room6AmmoniaData} />
					{/if}
				</div>

				<div class="step-nav-footer wq-footer">
					<div class="step-indicator">
						{stepLabels[room6Section]}
						{#if !room6Valid}
							<span class="step-hint" id="room6-save-help">• Save unlocks when every required field (*) is valid</span>
							<button type="button" class="show-missing-btn" onclick={revealModuleIssues}>Show what's missing</button>
						{/if}
					</div>
					<div class="right-action">
						<button
							type="button"
							class="nav-action-btn submit"
							class:disabled={!room6Valid || isSubmitting}
							disabled={!room6Valid || isSubmitting}
							aria-describedby={!room6Valid ? 'room6-save-help' : undefined}
							onclick={() => submitSteps([room6Section])}
						>
							{isSubmitting ? 'Saving...' : `Save ${stepLabels[room6Section]} to Sheets`}
						</button>
					</div>
				</div>
			</fieldset>
		{:else}
			<fieldset class="entry-form" disabled={isSubmitting} aria-busy={isSubmitting}>
			{@render sessionBar()}

			<div class="wq-only-intro">
				<strong>{shiftIntro[selectedShift].title}</strong>
				<span>{shiftIntro[selectedShift].text}</span>
			</div>
			<nav class="stepper-nav" aria-label="Husbandry Sections">
				{#each shiftSteps as step, index}
					<button type="button" class="step-chip" class:active={currentStep === index + 1} class:complete={stepValidity[index]} aria-current={currentStep === index + 1 ? 'step' : undefined} aria-disabled={!canNavigate(currentStep, index + 1, stepValidity)} onclick={() => jumpToStep(index + 1)}>
						<span class="step-num">{stepValidity[index] ? '✓' : index + 1}</span>
						<span class="step-label">{stepLabels[step]}</span>
					</button>
				{/each}
			</nav>

			{#if showValidation && activeIssues.length}
				<p id="step-validation-summary" class="validation-summary" role="alert">
					Complete the highlighted answers before continuing ({activeIssues.length} remaining).
				</p>
			{/if}

			<!-- Active Step Content -->
			<div class="step-content">
				{#if activeStep === 'lssAM'}
					{#if selectedShift === 'offDay'}
						<aside class="off-day-banner" aria-label="Off-day minimum check">
							<strong>Off-day check</strong>
							<p>Animals must be checked and recorded every day, including weekends and public holidays. Complete the animal welfare check and the AM tank checks. If water quality is not due today, tap <strong>Save off-day check (AM LSS only)</strong>; if it is due (at least every second day), select Next and record it too. If animals were fed, record feeds in the PM tab.</p>
						</aside>
					{:else if offDay && selectedShift === 'morning'}
						<aside class="off-day-banner" aria-label="Off-day reminder">
							<strong>{selectedDate} is an off-day</strong>
							<p>The <button type="button" class="link-btn" onclick={() => selectTab('offDay')}>Off-day check</button> tab shows only what is needed today. Your answers here carry over.</p>
						</aside>
					{/if}
					<LSSForm bind:data={lssAmData} />
				{:else if activeStep === 'lssPM'}
					<LSSForm bind:data={lssPmData} />
				{:else if activeStep === 'tanksEggs'}
					<TanksEggsForm
						bind:data={tanksEggsData}
					/>
				{:else if activeStep === 'feeds'}
					<FeedsForm
						bind:data={feedsData}
					/>
				{:else if activeStep === 'waterQuality'}
					{@render duplicateWaterQualityNotice(true)}
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
					Step {currentStep} of {shiftSteps.length}
					{#if !canAdvance}
						<span class="step-hint" id="next-step-help">{currentStep < shiftSteps.length ? '• Required answers pending — select Next to find them' : '• Required fields pending'}</span>
					{/if}
				</div>

				<div class="right-action">
					{#if currentStep < shiftSteps.length}
						<button
							type="button"
							class="nav-action-btn next"
							class:disabled={!canAdvance || isSubmitting}
							disabled={isSubmitting}
							aria-describedby={!canAdvance ? 'next-step-help' : undefined}
							onclick={nextStep}
						>
							Next Step →
						</button>
					{:else}
						<button
							type="button"
							class="nav-action-btn submit"
							class:disabled={!shiftValid || isSubmitting}
							disabled={!shiftValid || isSubmitting}
							onclick={() => submitSteps(shiftSteps)}
						>
							{isSubmitting ? 'Submitting...' : `Save ${shifts[selectedShift].label} to Sheets`}
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
					onclick={() => submitSteps([activeStep])}
				>
					{isSubmitting ? 'Saving...' : activeStep === 'lssAM' && (selectedShift === 'offDay' || offDay) ? 'Save off-day check (AM LSS only)' : `Save only ${stepLabels[activeStep]} to Sheets`}
				</button>
			</div>
			</fieldset>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="app-footer">
		<p>
			<strong>RummerLab Husbandry System</strong> • Physioshark / James Cook University
		</p>
		<p class="ethics-note">
			Animal Ethics Compliance & Strict Husbandry Records
		</p>
		<p><a href="/help">Animal welfare escalation guide &amp; vet video</a></p>
		<p><a href="/insights">Lab Overview (lab administrators, Google sign-in)</a></p>
		<p class="privacy-note">
			<strong>Privacy:</strong> when records sync, the server logs your IP address, approximate location (city/region/country), browser details and this device's ID, for security and audit of husbandry records. Only lab administrators can see this log; it is not part of the shared spreadsheet. Named lab administrators who sign in with Google can also view all submitted records in the Lab Overview.
		</p>
	</footer>
</div>

<style>
	.entry-form { border: 0; padding: 0; margin: 0; min-width: 0; display: flex; flex-direction: column; gap: 1.25rem; }
	.feedback-banner.pending { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }

	.validation-summary {
		padding: 0.85rem 1rem;
		border: 2px solid #dc2626;
		border-radius: 8px;
		background: #fff1f2;
		color: #991b1b;
		font-weight: 600;
	}
	.main-content :global([data-field][aria-invalid="true"]) {
		outline: 2px solid #dc2626;
		outline-offset: 3px;
		background-color: #fff1f2;
		scroll-margin-block: 6rem;
	}
	.nav-action-btn.next.disabled { cursor: pointer; }
	.nav-action-btn.next:focus-visible { outline: 3px solid #1d5fb8; outline-offset: 3px; }

	.app-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--page);
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

	.nav-action-btn.next:hover:not(.disabled) {
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

	.room6-sections {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.room6-section {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-height: 48px;
		padding: 0.6rem 0.75rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 10px;
		background: #fff;
		color: #334155;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.room6-section span { font-size: 0.78rem; color: #64748b; }

	.room6-section.active {
		border-color: #1d5fb8;
		background: #eff6ff;
		color: #0f172a;
	}

	.wq-only-intro {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.85rem 1rem;
		border: 1px solid #bae6fd;
		border-left: 4px solid #0284c7;
		border-radius: var(--radius);
		background: #f0f9ff;
		color: #0c4a6e;
		font-size: 0.9rem;
	}

	.validation-summary p { margin: 0; }
	.validation-summary ul { margin: 0.4rem 0 0; padding-left: 1.2rem; font-weight: 500; }

	.wq-footer {
		flex-wrap: wrap;
		gap: 0.6rem 1rem;
	}

	.wq-footer .step-indicator {
		flex: 1 1 14rem;
		min-width: 0;
		flex-wrap: wrap;
	}

	.wq-footer .right-action {
		flex: 1 1 auto;
		display: flex;
		justify-content: flex-end;
	}

	.wq-footer .nav-action-btn {
		max-width: 100%;
		white-space: normal;
	}

	@media (max-width: 480px) {
		.wq-footer {
			padding: 0.75rem;
		}

		.wq-footer .right-action .nav-action-btn {
			width: 100%;
			min-height: 48px;
		}
	}

	.show-missing-btn {
		display: block;
		margin: 0.35rem auto 0;
		min-height: 40px;
		padding: 0 0.85rem;
		border: 1.5px solid #dc2626;
		border-radius: 6px;
		background: #ffffff;
		color: #991b1b;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.show-missing-btn:focus-visible { outline: 3px solid #1d5fb8; outline-offset: 2px; }

	.lab-records-panel {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: var(--ink-2);
		text-align: center;
	}

	.lab-records-link {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 1rem;
		border-radius: 6px;
		background: #334155;
		color: #ffffff;
		font-weight: 600;
		text-decoration: none;
	}

	.lab-records-link:hover { background: #1e293b; }

	.duplicate-wq-notice {
		margin-bottom: 1rem;
		padding: 0.85rem 1rem;
		background: #fffbeb;
		border: 1px solid #fcd34d;
		border-left: 4px solid #d97706;
		border-radius: 10px;
		color: #78350f;
		font-size: 0.88rem;
	}

	.duplicate-wq-notice p {
		margin: 0.3rem 0 0;
		line-height: 1.45;
	}

	.off-day-banner {
		margin-bottom: 1rem;
		padding: 0.85rem 1rem;
		background: #fffbeb;
		border: 1px solid #fcd34d;
		border-left: 4px solid #d97706;
		border-radius: 10px;
		color: #78350f;
		font-size: 0.88rem;
	}

	.link-btn {
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		font-weight: 700;
		text-decoration: underline;
		cursor: pointer;
	}

	.off-day-banner p {
		margin: 0.3rem 0 0;
		line-height: 1.45;
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

	.privacy-note {
		display: block;
		width: min(100%, 46rem);
		max-width: 46rem;
		margin: 0.75rem auto 0;
		padding: 0 0.5rem;
		box-sizing: border-box;
		text-align: center;
		font-size: 0.75rem;
		line-height: 1.45;
		color: #8d9aae;
	}

	.ethics-note {
		font-size: 0.78rem;
		color: #8d9aae;
	}


	@media (max-width: 640px) {
		.step-label {
			white-space: normal;
		}
		.step-chip {
			min-width: 48px;
			justify-content: center;
			padding: 0.5rem;
		}
		.step-indicator {
			font-size: 0.78rem;
		}
		/* Daily routine footer: status on its own line, then Back / Next or Submit side by side. */
		.step-nav-footer:not(.wq-footer) {
			flex-wrap: wrap;
			gap: 0.5rem;
			padding: 0.75rem;
		}
		.step-nav-footer:not(.wq-footer) .step-indicator {
			order: -1;
			flex: 1 0 100%;
			flex-wrap: wrap;
			justify-content: center;
			text-align: center;
		}
		.step-nav-footer:not(.wq-footer) .left-action:empty {
			display: none;
		}
		.step-nav-footer:not(.wq-footer) .left-action,
		.step-nav-footer:not(.wq-footer) .right-action {
			flex: 1 1 0;
			min-width: 0;
		}
		.step-nav-footer:not(.wq-footer) .nav-action-btn {
			width: 100%;
			min-height: 48px;
			padding: 0.55rem 0.6rem;
			white-space: normal;
		}
	}
</style>
