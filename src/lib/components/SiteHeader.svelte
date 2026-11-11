<script lang="ts">
	import { onMount } from 'svelte';
	import { shifts, type Shift } from '../shiftWorkflow';
	import { getLocalHistory } from '../storage';
	import type { HomeTab } from '../homeTab';

	export type HeaderHighlight = HomeTab | 'help' | 'insights';

	interface Props {
		/** Which destination is current (utility or recording tab). */
		highlight: HeaderHighlight;
		/** When provided, home tabs use buttons instead of full-page links. */
		onSelectTab?: (tab: HomeTab) => void;
		isOnline?: boolean;
		pendingCount?: number;
		/** Disable on long guides so fragment links never land underneath the header. */
		sticky?: boolean;
	}

	let { highlight, onSelectTab, isOnline, pendingCount, sticky = true }: Props = $props();

	let localOnline = $state(true);
	let localPending = $state(0);
	let showOnline = $derived(isOnline ?? localOnline);
	let showPending = $derived(pendingCount ?? localPending);
	let interactive = $derived(typeof onSelectTab === 'function');

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

<header class="site-header" class:sticky>
	<div class="header-container">
		<div class="brand-group">
			<a class="brand" href="/" aria-label="RummerLab Husbandry home">
				<img class="brand-logo" src="/rummerlab_logo_transparent.png" alt="RummerLab" height="38" />
				<span class="badge-app">Husbandry</span>
			</a>
			<div class="room-pill">
				<span class="room-dot"></span>
				<span>Room 12 Records</span>
			</div>
		</div>

		<div class="nav-controls">
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
						onclick={() => onSelectTab?.('history')}
					>
						📱 My Device History
					</button>
				{:else}
					<a class="nav-tab utility-tab" class:active={highlight === 'history'} href="/?tab=history" aria-current={highlight === 'history' ? 'page' : undefined}>
						📱 My Device History
					</a>
				{/if}
				<a
					class="nav-tab help-link"
					class:active={highlight === 'help'}
					href="/help"
					aria-current={highlight === 'help' ? 'page' : undefined}
				>
					📘 Escalation Guide
				</a>
				<a
					class="nav-tab help-link"
					class:active={highlight === 'insights'}
					href="/insights"
					aria-current={highlight === 'insights' ? 'page' : undefined}
				>
					📊 Lab Overview
				</a>
			</div>

			<div class="nav-tabs" role="tablist" aria-label="Recording workflows">
				{#each ['morning', 'noon'] as shift}
					{#if interactive}
						<button
							type="button"
							role="tab"
							aria-selected={highlight === shift}
							class="nav-tab"
							class:active={highlight === shift}
							onclick={() => onSelectTab?.(shift as Shift)}
						>
							{shifts[shift as Shift].label}
						</button>
					{:else}
						<a
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
						onclick={() => onSelectTab?.('waterQuality')}
					>
						💧 Water Quality
					</button>
				{:else}
					<a
						role="tab"
						aria-selected={highlight === 'waterQuality'}
						class="nav-tab"
						class:active={highlight === 'waterQuality'}
						href="/?tab=waterQuality"
					>
						💧 Water Quality
					</a>
				{/if}
				{#if interactive}
					<button
						type="button"
						role="tab"
						aria-selected={highlight === 'room6'}
						class="nav-tab"
						class:active={highlight === 'room6'}
						onclick={() => onSelectTab?.('room6')}
					>
						🥚 Room 6
					</button>
				{:else}
					<a
						role="tab"
						aria-selected={highlight === 'room6'}
						class="nav-tab"
						class:active={highlight === 'room6'}
						href="/?tab=room6"
					>
						🥚 Room 6
					</a>
				{/if}
			</div>
		</div>
	</div>
	<div class="navy-bar"></div>
</header>

<style>
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
		.room-pill {
			display: none;
		}
		.nav-controls,
		.nav-utilities,
		.nav-tabs {
			width: 100%;
		}
		.nav-utilities .nav-tab,
		.nav-tabs .nav-tab {
			flex: 1 1 auto;
			min-height: 48px;
			padding: 0.4rem 0.35rem;
			font-size: 0.78rem;
		}
	}
</style>
