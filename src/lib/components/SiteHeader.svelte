<script lang="ts">
	import { onMount } from 'svelte';
	import { shifts, type Shift } from '../shiftWorkflow';
	import { getLocalHistory } from '../storage';
	import { roomForTab, type HomeTab, type RecordingRoom, type Room12Tab } from '../homeTab';

	export type HeaderHighlight = HomeTab | 'help' | 'insights';

	interface Props {
		/** Which destination is current (utility or recording tab). */
		highlight: HeaderHighlight;
		room?: RecordingRoom;
		room12Tab?: Room12Tab;
		/** When provided, home tabs use buttons instead of full-page links. */
		onSelectTab?: (tab: HomeTab) => void;
		isOnline?: boolean;
		pendingCount?: number;
		/** Disable on long guides so fragment links never land underneath the header. */
		sticky?: boolean;
	}

	let { highlight, onSelectTab, isOnline, pendingCount, sticky = true, room, room12Tab = 'morning' }: Props = $props();

	let localOnline = $state(true);
	let localPending = $state(0);
	let showOnline = $derived(isOnline ?? localOnline);
	let showPending = $derived(pendingCount ?? localPending);
	let interactive = $derived(typeof onSelectTab === 'function');
	let menuOpen = $state(false);
	let menuButton: HTMLButtonElement;
	let headerElement: HTMLElement;
	const utilityLabels = { waterQuality: 'Water Quality', room6: 'Room 6', history: 'My Device History', help: 'Escalation Guide', insights: 'Lab Overview' };
	let currentRoom = $derived(room ?? (highlight === 'help' || highlight === 'insights' ? null : roomForTab(highlight)));
	let destinationLabel = $derived(highlight in shifts ? shifts[highlight as Shift].label : utilityLabels[highlight as keyof typeof utilityLabels]);
	let currentLabel = $derived(currentRoom ? `${currentRoom === 'room6' ? 'Room 6' : 'Room 12'} · ${highlight === 'room6' ? 'Egg room' : destinationLabel}` : destinationLabel);

	function selectTab(tab: HomeTab) {
		onSelectTab?.(tab);
		if (menuOpen) {
			menuOpen = false;
			menuButton?.focus();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menuOpen && window.matchMedia('(max-width: 640px)').matches) {
			event.preventDefault();
			menuOpen = false;
			menuButton?.focus();
		}
	}

	function handleOutsideClick(event: MouseEvent) {
		if (menuOpen && event.target instanceof Node && !headerElement?.contains(event.target)) menuOpen = false;
	}


	onMount(() => {
		const refresh = () => {
			localOnline = navigator.onLine;
			try {
				localPending = getLocalHistory().filter((h) => !h.synced).length;
			} catch {
				localPending = 0;
			}
		};
		refresh();
		window.addEventListener('online', refresh);
		window.addEventListener('offline', refresh);
		window.addEventListener('storage', refresh);
		return () => {
			window.removeEventListener('online', refresh);
			window.removeEventListener('offline', refresh);
			window.removeEventListener('storage', refresh);
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} onclick={handleOutsideClick} />

<header class="site-header" class:sticky bind:this={headerElement}>
	<div class="mobile-bar">
		<a class="mobile-brand" href="/" aria-label="RummerLab Husbandry home">
			<img src="/rummerlab_logo_transparent.png" alt="RummerLab" width="64" height="38" />
		</a>
		<div class="mobile-context">
			<strong class="mobile-destination">{currentLabel}</strong>
			<span class="mobile-status" class:offline={!showOnline}>
				<span class="status-dot" aria-hidden="true"></span>
				{showOnline ? 'Online' : 'Offline'} · {showPending} pending
			</span>
		</div>
		<button type="button" class="menu-toggle" aria-expanded={menuOpen} aria-controls="site-navigation" bind:this={menuButton} onclick={() => menuOpen = !menuOpen}>
			{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
		</button>
	</div>
	<div class="header-container">
		<div class="brand-group">
			<a class="brand" href="/" aria-label="RummerLab Husbandry home">
				<img class="brand-logo" src="/rummerlab_logo_transparent.png" alt="RummerLab" height="38" />
				<span class="badge-app">Husbandry</span>
			</a>
			<div class="room-pill">
				<span class="room-dot"></span>
				<span>{currentRoom === 'room6' ? 'Room 6 · Egg room' : currentRoom === 'room12' ? 'Room 12 · Breeding colony' : 'Choose a room'}</span>
			</div>
		</div>

		<div class="nav-controls" id="site-navigation" class:menu-open={menuOpen}>
			<div class="nav-utilities">
				<div class="network-badge" class:online={showOnline} class:offline={!showOnline}>
					<span class="status-dot"></span>
					<span>{showOnline ? 'Online' : 'Offline Mode'} · {showPending} pending</span>
				</div>
				{#if interactive}
					<button
						type="button"
						class="nav-tab utility-tab"
						class:active={highlight === 'history'}
						aria-pressed={highlight === 'history'}
						onclick={() => selectTab('history')}
					>
						📱 My Device History
					</button>
				{:else}
					<a onclick={() => menuOpen = false} class="nav-tab utility-tab" class:active={highlight === 'history'} href="/?tab=history" aria-current={highlight === 'history' ? 'page' : undefined}>
						📱 My Device History
					</a>
				{/if}
				<a onclick={() => menuOpen = false}
					class="nav-tab help-link"
					class:active={highlight === 'help'}
					href="/help"
					aria-current={highlight === 'help' ? 'page' : undefined}
				>
					📘 Escalation Guide
				</a>
				<a onclick={() => menuOpen = false}
					class="nav-tab help-link"
					class:active={highlight === 'insights'}
					href="/insights"
					aria-current={highlight === 'insights' ? 'page' : undefined}
				>
					📊 Lab Overview
				</a>
			</div>

			<div class="room-switcher" role="group" aria-label="Recording room">
				{#if interactive}
					<button type="button" class:active={currentRoom === 'room12'} aria-pressed={currentRoom === 'room12'} onclick={() => selectTab(room12Tab)}>
						<strong>Room 12</strong><span>Breeding colony</span>
					</button>
					<button type="button" class:active={currentRoom === 'room6'} aria-pressed={currentRoom === 'room6'} onclick={() => selectTab('room6')}>
						<strong>Room 6</strong><span>Egg room</span>
					</button>
				{:else}
					<a href={`/?tab=${room12Tab}`} onclick={() => menuOpen = false}><strong>Room 12</strong><span>Breeding colony</span></a>
					<a href="/?tab=room6" onclick={() => menuOpen = false}><strong>Room 6</strong><span>Egg room</span></a>
				{/if}
			</div>
			{#if currentRoom === 'room12'}

			<div class="nav-tabs" role="tablist" aria-label="Room 12 recording workflows">
				{#each Object.keys(shifts) as shift}
					{#if interactive}
						<button
							type="button"
							role="tab"
							aria-selected={highlight === shift}
							class="nav-tab"
							class:active={highlight === shift}
							onclick={() => selectTab(shift as Shift)}
						>
							{shifts[shift as Shift].label}
						</button>
					{:else}
						<a onclick={() => menuOpen = false}
							role="tab"
							aria-selected={highlight === shift}
							class="nav-tab"
							class:active={highlight === shift}
							href={`/?tab=${shift}`}
						>
							{shifts[shift as Shift].label}
						</a>
					{/if}
				{/each}
				{#if interactive}
					<button
						type="button"
						role="tab"
						aria-selected={highlight === 'waterQuality'}
						class="nav-tab"
						class:active={highlight === 'waterQuality'}
						onclick={() => selectTab('waterQuality')}
					>
						💧 Water Quality
					</button>
				{:else}
					<a onclick={() => menuOpen = false}
						role="tab"
						aria-selected={highlight === 'waterQuality'}
						class="nav-tab"
						class:active={highlight === 'waterQuality'}
						href="/?tab=waterQuality"
					>
						💧 Water Quality
					</a>
				{/if}
			</div>
			{:else if currentRoom === 'room6'}
			<div class="nav-tabs" role="tablist" aria-label="Room 6 recording">

				{#if interactive}
					<button
						type="button"
						role="tab"
						aria-selected={highlight === 'room6'}
						class="nav-tab"
						class:active={highlight === 'room6'}
						onclick={() => selectTab('room6')}
					>
						Egg room records
					</button>
				{:else}
					<a onclick={() => menuOpen = false}
						role="tab"
						aria-selected={highlight === 'room6'}
						class="nav-tab"
						class:active={highlight === 'room6'}
						href="/?tab=room6"
					>
						Egg room records
					</a>
				{/if}
			</div>
			{/if}

		</div>
	</div>
	<div class="navy-bar"></div>
</header>

<style>
	.room-switcher { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
	.room-switcher button, .room-switcher a {
		min-height: 48px; min-width: 0; display: flex; flex-direction: column; justify-content: center;
		padding: 0.45rem 0.75rem; border: 1px solid var(--hairline); border-radius: 8px;
		background: var(--surface); color: var(--ink-2); text-align: left; font: inherit;
		text-decoration: none; cursor: pointer;
	}
	.room-switcher span { font-size: 0.72rem; }
	.room-switcher strong { font-size: 0.86rem; }
	.room-switcher .active { border-color: var(--accent); background: var(--surface-2); color: var(--accent); }
	.room-switcher button:focus-visible, .room-switcher a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

	.mobile-bar { display: none; }

	.site-header {
		position: relative;
		z-index: 50;
		background: #ffffff;
		box-shadow: 0 1px 3px rgba(16, 32, 56, 0.05);
	}

	.site-header.sticky {
		position: sticky;
		top: 0;
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
		flex-direction: column;
		align-items: stretch;
		gap: 0.55rem;
		flex: 1 1 18rem;
		min-width: 0;
	}

	.nav-utilities {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.45rem;
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
		flex-wrap: wrap;
		gap: 0.3rem;
		background: var(--surface-2);
		padding: 0.25rem;
		border-radius: 8px;
		border: 1px solid var(--hairline);
	}

	.nav-tab.help-link,
	.nav-tab.utility-tab {
		border: 1px solid var(--hairline);
		background: var(--surface);
		min-height: 48px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		color: var(--ink-2);
	}

	.nav-tab.utility-tab.active,
	.nav-tab.help-link.active {
		background: #ffffff;
		color: var(--accent);
		box-shadow: 0 1px 3px rgba(16, 32, 56, 0.08);
	}

	.nav-tab {
		min-height: 48px;
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
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	.nav-tab:hover {
		color: var(--ink);
	}

	.nav-tab.active {
		background: #ffffff;
		color: var(--accent);
		box-shadow: 0 1px 3px rgba(16, 32, 56, 0.08);
	}

	@media (max-width: 640px) {
		.mobile-bar {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.5rem 0.75rem;
		}
		.mobile-brand { display: flex; align-items: center; min-height: 48px; flex-shrink: 0; }
		.mobile-brand img { width: 64px; height: 38px; object-fit: contain; }
		.mobile-context { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
		.mobile-destination { font-size: 0.82rem; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.mobile-status { display: flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; color: var(--good); }
		.mobile-status .status-dot { background: currentColor; flex-shrink: 0; }
		.mobile-status.offline { color: var(--warn); }
		.menu-toggle {
			display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
			min-height: 48px; min-width: 76px; flex-shrink: 0; padding: 0.5rem 0.65rem;
			border: 1px solid var(--hairline); border-radius: 8px; background: var(--surface-2);
			color: var(--ink); font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer;
		}
		.menu-toggle:focus-visible, .mobile-brand:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
		.header-container { padding: 0; gap: 0; }
		.brand-group { display: none; }
		.nav-controls { display: none; }
		.nav-controls.menu-open {
			display: flex; flex: 1 1 100%; width: 100%; box-sizing: border-box;
			padding: 0 0.75rem 0.75rem; max-height: calc(100dvh - 68px); overflow-y: auto;
			overscroll-behavior: contain;
		}
		.nav-utilities, .nav-tabs { width: 100%; box-sizing: border-box; }
		.nav-utilities .network-badge { display: none; }
		.nav-utilities .nav-tab, .nav-tabs .nav-tab {
			flex: 1 1 auto; min-height: 48px; padding: 0.4rem 0.5rem; font-size: 0.8rem;
		}
	}
</style>
