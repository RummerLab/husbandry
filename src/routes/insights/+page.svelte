<script lang="ts">
	import type { PageData } from './$types';
	import { WATER_QUALITY_RANGES } from '../../lib/insightsConfig';

	let { data }: { data: PageData } = $props();

	const routine = [
		{ key: 'temp', label: 'Temp °C' },
		{ key: 'salinity', label: 'Salinity' },
		{ key: 'pH', label: 'pH' },
		{ key: 'do', label: 'DO %' }
	];
	const weekly = [
		{ key: 'alk', label: 'Alk' },
		{ key: 'weeklypH', label: 'pH (wk)' },
		{ key: 'nh3', label: 'NH3' },
		{ key: 'no2', label: 'NO2' },
		{ key: 'no3', label: 'NO3' },
		{ key: 'po4', label: 'PO4' }
	];
	const rangeText = (key: string) => {
		const r = WATER_QUALITY_RANGES[key === 'weeklypH' ? 'pH' : key];
		if (!r) return '';
		if (r.min !== undefined && r.max !== undefined) return `${r.min}–${r.max}`;
		return r.min !== undefined ? `≥ ${r.min}` : `≤ ${r.max}`;
	};
	const shortDate = (iso: string) => {
		const d = new Date(`${iso}T00:00:00Z`);
		return isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
	};
	let latestWeekly = $derived(data.signedIn && data.overview ? data.overview.waterQuality.find(d => d.weekly) : undefined);
	let flaggedTanks = $derived(data.signedIn && data.overview ? data.overview.feeding.filter(t => t.flagged) : []);
	let feedDates = $derived(data.signedIn && data.overview ? [...new Set(data.overview.feeding.flatMap(t => t.days.map(d => d.date)))].sort().reverse() : []);
</script>

<svelte:head>
	<title>Lab Overview · RummerLab Husbandry</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="page">
	<header class="top">
		<a class="back" href="/">← Husbandry records</a>
		<h1>Lab Overview</h1>
		<p class="sub">All Room 12 records from the master spreadsheet. Visible only to named lab administrators.</p>
	</header>

	{#if data.message}
		<p class="notice" role="status">{data.message}</p>
	{/if}

	{#if !data.signedIn}
		<section class="card signin">
			{#if data.configured}
				<p>Sign in with an approved Google account to see lab-wide records.</p>
				<a class="btn primary" href="/auth/google?returnTo=/insights" rel="external">Sign in with Google</a>
			{:else}
				<p>Lab Overview sign-in isn't configured on this deployment yet. See <code>docs/lab-overview.md</code>.</p>
			{/if}
		</section>
	{:else}
		<section class="card who">
			<span>Signed in as <strong>{data.admin.name || data.admin.email}</strong> ({data.admin.email})</span>
			<div class="actions">
				{#if data.sheetUrl}<a class="btn" href={data.sheetUrl} target="_blank" rel="noopener noreferrer">Master sheet ↗</a>{/if}
				{#if data.lookerStudioUrl}<a class="btn" href={data.lookerStudioUrl} target="_blank" rel="noopener noreferrer">Looker Studio ↗</a>
				{:else if data.lookerCreateUrl}<a class="btn" href={data.lookerCreateUrl} target="_blank" rel="noopener noreferrer" title="Creates a new Looker Studio report connected to the four tabs. Save it, then set LOOKER_STUDIO_URL.">Create Looker Studio report ↗</a>{/if}
				<a class="btn" href="/insights?refresh" rel="external">Refresh</a>
				<form method="POST" action="/auth/signout"><button class="btn" type="submit">Sign out</button></form>
			</div>
		</section>

		{#if data.error}
			<p class="notice error" role="alert">{data.error}</p>
		{:else if data.overview}
			{@const o = data.overview}
			<p class="meta">Up to {o.today} (Brisbane) · last {o.days} days · loaded {data.loadedAt ? new Date(data.loadedAt).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit' }) : ''} · {o.counts.lss + o.counts.tanksEggs + o.counts.feeds + o.counts.waterQuality} rows in the sheet</p>

			<section class="card attention" aria-labelledby="attention">
				<h2 id="attention">Needs attention</h2>
				<ul>
					{#if o.missingDailyChecks.length}
						<li class="bad"><strong>{o.missingDailyChecks.length} day(s) without a daily LSS check:</strong> {o.missingDailyChecks.map(shortDate).join(', ')}</li>
					{/if}
					{#each o.concerns.filter(c => c.animalsNormal === 'N') as c}
						<li class="bad"><strong>{shortDate(c.date)}: animals not all sighted/normal</strong> ({c.initials}) {c.text}</li>
					{/each}
					{#each flaggedTanks as t}
						<li class="warn"><strong>{t.name}:</strong> ate nothing on {t.lowIntakeDays} of the last {t.days.length} recorded day(s)</li>
					{/each}
					{#each o.waterQuality.filter(d => Object.values(d.readings).some(r => r.flagged)) as d}
						<li class="warn"><strong>{shortDate(d.date)} water quality out of range:</strong> {Object.entries(d.readings).filter(([, r]) => r.flagged).map(([k, r]) => `${k} ${r.raw}`).join(', ')}</li>
					{/each}
					{#if !o.missingDailyChecks.length && !o.concerns.some(c => c.animalsNormal === 'N') && !flaggedTanks.length && !o.waterQuality.some(d => Object.values(d.readings).some(r => r.flagged))}
						<li class="good">Nothing flagged in the last {o.days} days.</li>
					{/if}
				</ul>
			</section>

			<section class="card" aria-labelledby="wq">
				<h2 id="wq">Water quality (last {o.days} days)</h2>
				{#if o.waterQuality.length}
					<div class="scroll">
						<table>
							<thead>
								<tr><th>Date</th>{#each routine as p}<th colspan="2">{p.label}<br /><small>{rangeText(p.key)}</small></th>{/each}<th>By</th></tr>
								<tr class="sides"><th></th>{#each routine as _}<th>A</th><th>B</th>{/each}<th></th></tr>
							</thead>
							<tbody>
								{#each o.waterQuality as d}
									<tr>
										<td>{shortDate(d.date)}{#if d.weekly} <span class="tag">wk</span>{/if}</td>
										{#each routine as p}
											{#each ['A', 'B'] as side}
												{@const r = d.readings[`${p.key}${side}`]}
												<td class:flag={r?.flagged}>{r?.raw || '–'}</td>
											{/each}
										{/each}
										<td>{d.initials}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if latestWeekly}
						<h3>Latest weekly chemistry · {shortDate(latestWeekly.date)}</h3>
						<div class="scroll">
							<table>
								<thead><tr><th>Side</th>{#each weekly as p}<th>{p.label}<br /><small>{rangeText(p.key)}</small></th>{/each}</tr></thead>
								<tbody>
									{#each ['A', 'B'] as side}
										<tr><td>{side}</td>{#each weekly as p}{@const r = latestWeekly.readings[`${p.key}${side}`]}<td class:flag={r?.flagged}>{r?.raw || '–'}</td>{/each}</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
					<p class="hint">Highlighted values are outside <strong>provisional</strong> ranges (<code>src/lib/insightsConfig.ts</code>); confirm them with the lab.</p>
				{:else}
					<p class="empty">No water quality records in the last {o.days} days.</p>
				{/if}
			</section>

			<section class="card" aria-labelledby="palp">
				<h2 id="palp">Females: palpation</h2>
				<div class="scroll">
					<table>
						<thead><tr><th>Female</th><th>Latest</th><th>Checked</th><th>Last holding eggs</th></tr></thead>
						<tbody>
							{#each o.palpation as p}
								<tr>
									<td><strong>{p.female}</strong></td>
									<td class:holding={['L', 'R', 'B'].includes(p.latest.toUpperCase())}>{p.latest || '–'}</td>
									<td>{p.latestDate ? shortDate(p.latestDate) : '–'}</td>
									<td>{p.lastEggsDate ? `${shortDate(p.lastEggsDate)} (${p.lastEggs})` : 'not recorded'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="hint">0 = none · L = left · R = right · B = both.</p>
			</section>

			<section class="card" aria-labelledby="feed">
				<h2 id="feed">Feeding: grams eaten (fed − uneaten), last 7 days</h2>
				{#if feedDates.length}
					<div class="scroll">
						<table>
							<thead><tr><th>Tank</th>{#each feedDates as date}<th>{shortDate(date)}</th>{/each}</tr></thead>
							<tbody>
								{#each o.feeding as t}
									<tr class:flagrow={t.flagged}>
										<td>{t.name}</td>
										{#each feedDates as date}
											{@const d = t.days.find(x => x.date === date)}
											<td class:flag={d?.eaten === 0} title={d ? `fed ${d.fed ?? '–'} g, uneaten ${d.uneaten ?? '–'} g` : ''}>{d?.eaten ?? '–'}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="empty">No feeding records in the last 7 days.</p>
				{/if}
			</section>

			<section class="card" aria-labelledby="eggs">
				<h2 id="eggs">Eggs, embryos and moves</h2>
				{#if o.eggs.length}
					<ul class="list">
						{#each o.eggs as e}
							<li>
								<strong>{shortDate(e.date)}</strong> ({e.initials})
								{#if e.newEggs && e.newEggs !== '0'}· new eggs {e.newEggs}{e.newEggTag && e.newEggTag !== '0' ? ` (tag ${e.newEggTag})` : ''}{/if}
								{#if e.windEggs && e.windEggs !== '0'}· wind eggs {e.windEggs}{/if}
								{#if e.embryos === 'Y'}· new embryos{/if}
								{#if e.candling === 'Y'}· candled{/if}
								{#if e.deadEggTag && e.deadEggTag !== '0'}· dead egg {e.deadEggTag}{/if}
								{#if e.move}· move: {e.move}{/if}
								{#if e.notes}<div class="note">{e.notes}</div>{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty">No egg activity, moves or notes in the last {o.days} days.</p>
				{/if}
			</section>

			<section class="card" aria-labelledby="concerns">
				<h2 id="concerns">LSS concerns and notes</h2>
				{#if o.concerns.length}
					<ul class="list">
						{#each o.concerns as c}
							<li class:badtext={c.animalsNormal === 'N'}>
								<strong>{shortDate(c.date)}</strong> ({c.initials}){c.animalsNormal ? ` · animals normal: ${c.animalsNormal}` : ''}
								{#if c.text}<div class="note">{c.text}</div>{/if}
								{#if c.notes}<div class="note">{c.notes}</div>{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty">No concerns or notes in the last {o.days} days.</p>
				{/if}
			</section>
		{/if}
	{/if}
</div>

<style>
	.page { box-sizing: border-box; width: 100%; min-width: 0; max-width: 1040px; margin: 0 auto; padding: 1.25rem 1rem 3rem; display: flex; flex-direction: column; gap: 1rem; font-family: var(--font); color: var(--ink); }
	.top h1 { margin: 0.35rem 0 0.2rem; font-size: 1.5rem; }
	.sub, .meta, .hint { color: var(--muted); font-size: 0.85rem; margin: 0; }
	.back { color: var(--accent); font-weight: 600; text-decoration: none; font-size: 0.9rem; }
	.card { background: var(--surface); border: 1px solid var(--hairline); border-radius: 10px; padding: 1rem; min-width: 0; }
	.card h2 { margin: 0 0 0.75rem; font-size: 1.05rem; }
	.card h3 { margin: 1rem 0 0.5rem; font-size: 0.95rem; }
	.signin { display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; }
	.who { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; align-items: center; font-size: 0.88rem; }
	.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.actions form { margin: 0; }
	.btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 0.9rem; border-radius: 7px; border: 1px solid var(--hairline); background: var(--surface-2); color: var(--ink); font: inherit; font-size: 0.85rem; font-weight: 600; text-decoration: none; cursor: pointer; }
	.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
	.notice { padding: 0.75rem 1rem; border-radius: 8px; background: var(--warn-bg); border: 1px solid var(--warn-border); color: var(--warn); margin: 0; }
	.notice.error { background: var(--bad-bg); border-color: var(--bad-border); color: var(--bad); }
	.attention ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; }
	.attention .bad { color: var(--bad); }
	.attention .warn { color: var(--warn); }
	.attention .good { color: var(--good); list-style: none; margin-left: -1.1rem; }
	.scroll { max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
	table { border-collapse: collapse; width: 100%; font-size: 0.82rem; font-variant-numeric: tabular-nums; }
	th, td { padding: 0.4rem 0.45rem; border-bottom: 1px solid var(--grid); text-align: center; white-space: nowrap; }
	th:first-child, td:first-child { text-align: left; position: sticky; left: 0; background: var(--surface); }
	th { color: var(--ink-2); font-weight: 700; }
	th small { font-weight: 500; color: var(--muted); }
	.sides th { font-size: 0.75rem; color: var(--muted); }
	td.flag { background: var(--bad-bg); color: var(--bad); font-weight: 700; }
	td.holding { background: var(--good-bg); color: var(--good); font-weight: 700; }
	tr.flagrow td:first-child { color: var(--warn); font-weight: 700; }
	.tag { font-size: 0.68rem; background: var(--accent-wash); color: var(--accent-ink); border-radius: 4px; padding: 0 0.3rem; }
	.list { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.88rem; }
	.list .note { color: var(--ink-2); white-space: pre-wrap; overflow-wrap: anywhere; }
	.badtext { color: var(--bad); }
	.empty { color: var(--muted); font-size: 0.88rem; margin: 0; }
	code { font-size: 0.8em; }
</style>
