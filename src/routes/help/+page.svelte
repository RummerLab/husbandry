<script lang="ts">
	import { room12Date } from '../../lib/recordRules';
	import {
		ESCALATION_VIDEO, VET_CONTACTS, SOURCE_FOLDER_URL, SOURCE_DOCUMENTS, TEMPERATURE_SETPOINTS,
		LAST_REVIEWED, NEXT_REVIEW_DUE, WATER_QUALITY_LIMITS, WATER_QUALITY_ROOMS, aquiSVolumeMl, reviewStatus, longDate, type RoomId
	} from '../../lib/help/escalationGuide';
	import { ESCALATION_TRANSCRIPT } from '../../lib/help/escalationTranscript';

	const today = room12Date();
	const review = reviewStatus(today);
	const month = Number(today.slice(5, 7));
	let roomId = $state<RoomId>('room12');
	let room = $derived(WATER_QUALITY_ROOMS.find(r => r.id === roomId)!);
</script>

<svelte:head>
	<title>Animal Welfare Escalation Guide · RummerLab Husbandry</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="page">
	<header class="top">
		<a class="back" href="/">← Husbandry records</a>
		<h1>Animal Welfare Escalation Guide</h1>
		<p class="sub">Epaulette sharks (<em>Hemiscyllium ocellatum</em>) · Room 12 (breeding colony) and Room 6 (egg room) · What to look for, who to tell and what to do.</p>
		<p class="reviewed">
			<strong>Last reviewed:</strong> <time datetime={LAST_REVIEWED}>{longDate(LAST_REVIEWED)}</time>
			· <strong>Next review due:</strong> <time datetime={NEXT_REVIEW_DUE}>{longDate(NEXT_REVIEW_DUE)}</time>
		</p>
		{#if review.overdue}
			<p class="notice bad" role="alert">This guide is past its review date. Check the current versions of the source documents with the lab manager before relying on it.</p>
		{/if}
	</header>

	<section class="card urgent" aria-labelledby="first">
		<h2 id="first">If in doubt, tell someone now</h2>
		<p>Don't wait for the next check or for signs to get worse. It is far better to raise something early and be wrong than to wait. Disease in fish and sharks can escalate within 24 to 48 hours.</p>
		<div class="call-grid">
			{#each VET_CONTACTS as c}
				<a class="call" href="tel:{c.tel}">
					<span class="role">{c.role}</span>
					<span class="name">{c.name}</span>
					<span class="phone">📞 {c.phone}</span>
				</a>
			{/each}
		</div>
		<p><span class="role">Lab manager</span> Emily Parrish. When Emily is away: Jodie Rummer or Terese Vella.</p>
		<p class="small"><strong>Urgent:</strong> phone. <strong>Not urgent:</strong> RummerLab Husbandry WhatsApp channel.</p>
	</section>

	<section class="card video" aria-labelledby="video">
		<h2 id="video">Watch the video</h2>
		<p><strong>{ESCALATION_VIDEO.title}</strong><br />{ESCALATION_VIDEO.presenter} · {ESCALATION_VIDEO.recorded} · {ESCALATION_VIDEO.duration}</p>
		<div class="actions">
			<a class="btn primary" href={ESCALATION_VIDEO.url} target="_blank" rel="noopener noreferrer">▶ Watch on Dropbox ↗</a>
			<a class="btn" href="#transcript">Read the transcript</a>
			<a class="btn" href={SOURCE_FOLDER_URL} target="_blank" rel="noopener noreferrer">Source documents ↗</a>
		</div>
		<p class="small">The video and documents need an internet connection. This page also works offline once it has been opened on this device.</p>
	</section>

	<nav class="card toc" aria-label="On this page">
		<h2>On this page</h2>
		<ol>
			<li><a href="#normal">Know what normal looks like</a></li>
			<li><a href="#signs">Signs to look for</a></li>
			<li><a href="#pathway">Escalation pathway (Checks 1–3)</a></li>
			<li><a href="#calling">When calling the vet</a></li>
			<li><a href="#protect">Protect tank mates and record</a></li>
			<li><a href="#mortality">Finding a dead animal</a></li>
			<li><a href="#euthanasia">Euthanasia (vet-directed only)</a></li>
			<li><a href="#water">Water quality limits and actions (Room 12 / Room 6)</a></li>
			<li><a href="#app">Recording it in this app (Room 12)</a></li>
			<li><a href="#transcript">Video transcript</a></li>
		</ol>
	</nav>

	<section class="card" aria-labelledby="normal">
		<h2 id="normal">1. Know what normal looks like</h2>
		<p>At every scheduled check, identify each shark and compare its behaviour and condition with <em>its own</em> usual pattern. The better you know normal, the faster you will spot when something is wrong.</p>
		<ul>
			<li><strong>Breathing (ventilation):</strong> count gill-slit movements for 30 seconds and double it for beats per minute. Learn each animal's resting rate so you can tell when it is breathing faster or slower than usual.</li>
			<li><strong>Activity and swimming:</strong> how much they move, swimming pattern and posture, and whether they settle as expected.</li>
			<li><strong>Feeding response:</strong> how soon they normally take food, and whether you can tell when one hasn't eaten. Feeding is a few times a week, so knowing each animal's pattern matters.</li>
			<li><strong>Age:</strong> juveniles, especially first-feeding juveniles, often behave and feed differently from adults.</li>
		</ul>
	</section>

	<section class="card" aria-labelledby="signs">
		<h2 id="signs">2. Signs to look for</h2>
		<ul>
			<li>Reduced feeding or refusal to feed.</li>
			<li>Breathing faster or slower than the animal's normal rate.</li>
			<li>Agitation, not settling, or repeated stop-start swimming.</li>
			<li>Loss of normal responsiveness, trouble righting itself, falling over, or not swimming or holding its usual posture.</li>
			<li>Skin redness, particularly on the underside (ventrum) or around the fins. Note whether it is one spot (focal) or spread across the underside (diffuse).</li>
			<li>Wounds or bleeding. Record where the wound is and roughly how big (e.g. 0.25 cm, 0.5 cm).</li>
			<li>Unusual faeces on the tank floor: changed colour, consistency or shape, or a fecal cast (an unusual tube of faeces).</li>
			<li>Other changes listed in the mortality procedure: spiralling, erratic swimming, cloudy eyes, fin lesions.</li>
		</ul>
	</section>

	<section class="card" aria-labelledby="pathway">
		<h2 id="pathway">3. Escalation pathway</h2>
		<p>Start at Check 1 at every scheduled check. Record your observations and the required water-quality readings. If signs worsen at any stage, go straight back to Check 1.</p>

		<div class="step red">
			<h3>Check 1 · Is there an immediate threat to a shark or the population?</h3>
			<p>For example: marked or worsening change in breathing effort; loss of normal responsiveness or righting; unable to swim or hold its usual posture; significant injury or bleeding; rapidly worsening signs; more than one shark becoming unwell over a short period; suspected contamination; or failure of a critical life-support system.</p>
			<p class="action"><strong>YES → Call the vet now and notify your supervisor.</strong> If the usual vet is unavailable, use the after-hours contact. Do not wait for the next check or for signs to worsen.</p>
			<p><strong>While help is being contacted:</strong></p>
			<ul>
				<li>Follow any other appropriate approved emergency procedure.</li>
				<li>Check the affected tank and system; promptly measure and report relevant water parameters.</li>
				<li>Reduce avoidable disturbance.</li>
				<li><strong>Do not</strong> medicate, handle, transfer or make major system changes unless the vet directs it or an approved emergency procedure requires it.</li>
			</ul>
			<p class="next">NO → go to Check 2.</p>
		</div>

		<div class="step amber">
			<h3>Check 2 · Has an unexpected death occurred?</h3>
			<p class="action"><strong>YES → Contact the vet the same day</strong> and follow their instructions for carcass storage and post-mortem. Typically: <strong>chill, do not freeze</strong> (see <a href="#mortality">Finding a dead animal</a>).</p>
			<p>If deaths are clustered or another shark is deteriorating, treat it as an immediate population emergency and <strong>call now</strong>.</p>
			<p class="next">NO → go to Check 3.</p>
		</div>

		<div class="step blue">
			<h3>Check 3 · Is there a new, mild change?</h3>
			<p>For example: reduced feeding, unusual activity or swimming, a new skin change, or a water-quality reading approaching its action limit.</p>
			<p class="action"><strong>YES → Record, check and inform.</strong> Record what changed and when, check the relevant readings and equipment, and inform your supervisor.</p>
			<ul>
				<li>Contact the vet the same day if the change persists, recurs, worsens, or a water-quality action limit is exceeded.</li>
				<li>If it resolves, keep observing more closely as directed by your supervisor or the vet, and record the outcome.</li>
				<li>One reading returning to range does not by itself mean the cause has resolved.</li>
			</ul>
		</div>

		<div class="step green">
			<h3>No change or concern</h3>
			<p>Continue scheduled monitoring and recording.</p>
		</div>
	</section>

	<section class="card" aria-labelledby="calling">
		<h2 id="calling">4. When calling the vet, have ready</h2>
		<ol>
			<li>Shark identification and tank.</li>
			<li>Signs observed and when they began.</li>
			<li>Whether other sharks are affected.</li>
			<li>Recent feeding, handling, system work or any other change (including new people in the room).</li>
			<li>Relevant current readings and their usual values.</li>
			<li>Any action already taken.</li>
		</ol>
	</section>

	<section class="card" aria-labelledby="protect">
		<h2 id="protect">5. Protect tank mates and record what you see</h2>
		<ul>
			<li><strong>Think about tank mates.</strong> What else is in that tank or system? Ask your supervisor whether the individual can or should be isolated.</li>
			<li><strong>Hygiene and biosecurity first.</strong> Until we know otherwise, treat it as possibly infectious. Never move a net, hands or any instrument from one body of water to another without proper disinfection.</li>
			<li><strong>Take notes:</strong> time, tank, system, animal ID(s), behaviour, any visible lesion or discolouration, refusal to feed, anything else relevant, and the water-quality results.</li>
		</ul>
	</section>

	<section class="card" aria-labelledby="mortality">
		<h2 id="mortality">6. Finding a dead animal</h2>
		<ol>
			<li>Make sure the animal is dead: no gill (operculum) movement, no response to a hard tail pinch, and no eye reflex (eye poke).</li>
			<li>Notify the lab manager immediately and photograph the animal as it was found. Contact the vet the same day (Check 2).</li>
			<li>Record the circumstances: tank, time, water quality, tank mates.</li>
			<li>Keep hygiene and biosecurity in mind while handling it.</li>
			<li>Go to the MARFU walk-in freezer and choose the bucket from our shelf that fits the specimen (big bucket for adults and large juveniles, small for neonates and small juveniles). The black bucket should already have ice. If the bucket isn't there, check under tank 1 in Room 12; with no ice, store the specimen in water from its tank.</li>
			<li>Put the specimen in the bucket with the lid firmly on, and put the tank's ID sticker on the lid.</li>
			<li>Take the bucket to the MARFU fridge (the shelf where the prawns are defrosted). <strong>Chill, do not freeze:</strong> freezing prevents histology and post-mortem diagnosis. It must be removed within 24 hours for necropsy.</li>
			<li>Tell the lab manager when it is done.</li>
			<li>Record the removal as a mortality in the animal movements section (see <a href="#app">Recording it in this app</a>).</li>
			<li>Watch tank mates and other animals in the system closely for abnormal behaviour: not eating, spiralling, erratic swimming, abnormal breathing, cloudy eyes, fin lesions.</li>
		</ol>
	</section>

	<section class="card" aria-labelledby="euthanasia">
		<h2 id="euthanasia">7. Euthanasia (vet-directed only)</h2>
		<p class="notice">Euthanasia is done only when necessary, is <strong>directed by the veterinarian</strong> through the escalation pathway, and is <strong>carried out only by a listed investigator</strong> (Jodie Rummer, Emily Parrish or Terese Vella). The secondary physical step is done only by a listed investigator trained by Dr Foyle or Prof Rummer. This summary is for awareness; follow the full SOP.</p>
		<ul>
			<li><strong>Method:</strong> epaulette sharks tolerate low oxygen, so euthanasia is two-step: immersion in AQUI-S (isoeugenol), then a secondary physical step. Death is confirmed before the animal is removed.</li>
			<li><strong>Bath:</strong> a known volume of water from the shark's system (or matching temperature, salinity and pH), big enough for the shark to lie fully immersed, with aeration left running.</li>
			<li><strong>Dose:</strong> 400 mg/L. AQUI-S volume (mL) = 400 × bath volume (L) ÷ 540. For example 10 L → {aquiSVolumeMl(10)} mL, 50 L → {aquiSVolumeMl(50)} mL, 100 L → {aquiSVolumeMl(100)} mL. Dispense under water, mix gently, and wait a few minutes before adding the shark.</li>
			<li><strong>Record times:</strong> immersion, loss of equilibrium (belly up), and when gill movement stops.</li>
			<li><strong>Time in bath:</strong> at least 30 minutes, preferably about 1 hour.</li>
			<li><strong>If tissue is needed for histology:</strong> the supervisor decides, on the vet's advice. The shark is heavily sedated at 400 mg/L and, as soon as it is unresponsive (often 5–10 minutes), a qualified person pithes it so tissues can be sampled before they deteriorate.</li>
			<li><strong>Confirm death:</strong> observe for 2–5 minutes. Death = no gill movement, no response to a hard tail pinch, and no corneal reflex. Gills stopping alone is <em>not</em> accepted as death in this species.</li>
			<li><strong>Afterwards:</strong> double-bag the carcass, seal with zip ties, and place in the wet-waste freezer in Building 71. Complete a euthanasia record each time.</li>
		</ul>
	</section>

	<section class="card" aria-labelledby="water">
		<h2 id="water">8. Water quality limits and actions</h2>
		<p><strong>Test every second day, before feeding, at the same time of day.</strong> Tell the lab manager about any reading outside these limits. The limits are the same in both rooms, but <strong>the actions and pH dosing are different</strong>: choose the room you are testing.</p>
		<div class="room-switch" role="group" aria-label="Room">
			{#each WATER_QUALITY_ROOMS as r}
				<button type="button" aria-pressed={roomId === r.id} class:active={roomId === r.id} onclick={() => (roomId = r.id)}>
					<strong>{r.name}</strong> <span>{r.description}</span>
				</button>
			{/each}
		</div>
		<h3 class="room-title">{room.name} · {room.description}</h3>
		<div class="scroll">
			<table class="limits">
				<thead><tr><th>Parameter</th><th>Acceptable</th><th>If outside the range ({room.name})</th></tr></thead>
				<tbody>
					{#each WATER_QUALITY_LIMITS as l}
						<tr><td>{l.parameter}</td><td>{l.acceptable}</td><td>{room.actions[l.key]}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="grid">
			<div class="ph-card">
				<h3>pH adjustment ({room.name})</h3>
				<p class="small">Only if pH is below 8.0. About {room.ph.gramsPerTenth} g bicarbonate per +0.1 pH.</p>
				<ul>
					<li>pH 7.6 → {room.ph.at7_6} g bicarb to the sump</li>
					<li>pH 7.8 → {room.ph.at7_8} g bicarb to the sump</li>
					<li>pH above 8.6 → advise the lab manager, who asks MARFU to add acid</li>
				</ul>
				<p class="small"><strong>Check the room:</strong> Room 12 and Room 6 doses are very different.</p>
			</div>
			<div>
				<h3>Temperature setpoints (±1 °C)</h3>
				<table class="compact">
					<tbody>
						{#each TEMPERATURE_SETPOINTS as s}
							<tr class:current={month >= s.from && month <= s.to}><td>{s.months}</td><td>{s.celsius} °C{#if month >= s.from && month <= s.to} <span class="tag">now</span>{/if}</td></tr>
						{/each}
					</tbody>
				</table>
				<p class="small">Setpoint changes are no more than 0.5 °C per day.</p>
			</div>
			<div>
				<h3>Also monitored</h3>
				<ul>
					<li>Dissolved oxygen: above 85% saturation</li>
					<li>Alkalinity: at least 7 dKH</li>
					<li>Phosphate: below 1 mg/L</li>
					<li>Calcium: 380–420 mg/L</li>
					<li>Magnesium: 1,250–1,500 mg/L</li>
				</ul>
				<p class="small">Any reading outside these limits: tell the lab manager.</p>
			</div>
		</div>
	</section>

	<section class="card" aria-labelledby="app">
		<h2 id="app">9. Recording it in this app (Room 12)</h2>
		<ul>
			<li><strong>Daily welfare check (<em>LSS + WQ</em> tab, LSS section):</strong> answer <em>"All animals sighted, with normal appearance &amp; behaviour"</em> with <strong>No</strong> if anything is wrong, then describe the animal, tank and signs under <em>New Concerns</em>. Saving the record does not notify anyone: tell your supervisor (or call the vet) as well.</li>
			<li><strong>Mortalities and moves (<em>Eggs + Feeds</em> tab, Tanks + Eggs section):</strong> use <em>Animal &amp; Egg Transfers / Mortalities</em>: description (e.g. "Mortality: HO105, found 8:10 am"), from tank, to tank and quantity. Add detail in <em>Observations / Notes</em>.</li>
			<li><strong>Feeding (<em>Eggs + Feeds</em> tab, Feeds section):</strong> record intake and uneaten feed per tank; note any refusal in the feeding observations.</li>
			<li><strong>Water quality (<em>LSS + WQ</em> tab, or the <em>Water Quality</em> tab on its own):</strong> record the readings, and use <em>Observations, Water Changes &amp; Actions</em> for retests, water changes and who you told.</li>
		</ul>
	</section>

	<section class="card" aria-labelledby="transcript">
		<h2 id="transcript">Video transcript</h2>
		<p class="small">Machine-generated from the video and lightly corrected for names and terms. If anything differs, the <a href={ESCALATION_VIDEO.url} target="_blank" rel="noopener noreferrer">video</a> and the written documents take precedence.</p>
		{#each ESCALATION_TRANSCRIPT as chapter}
			<details>
				<summary><span class="time">{chapter.start}</span> {chapter.title}</summary>
				{#each chapter.paragraphs as p}
					<p><span class="time">{p.time}</span> {p.text}</p>
				{/each}
			</details>
		{/each}
	</section>

	<section class="card sources" aria-labelledby="sources">
		<h2 id="sources">Sources and review</h2>
		<p>This guide summarises the documents below. Where they differ, the documents and the vet's directions take precedence.</p>
		<ul>
			{#each SOURCE_DOCUMENTS as d}<li>{d.title} <span class="muted">({d.version})</span></li>{/each}
		</ul>
		<p class="small">Last reviewed {longDate(LAST_REVIEWED)}. Review this page whenever a source document changes, and by {longDate(NEXT_REVIEW_DUE)} at the latest.</p>
	</section>
</div>

<style>
	.page { max-width: 880px; margin: 0 auto; padding: 1rem 1rem 3rem; display: flex; flex-direction: column; gap: 1rem; }
	.top h1 { margin: 0.4rem 0 0.2rem; font-size: 1.5rem; }
	.back { color: var(--accent-ink); text-decoration: none; font-weight: 600; display: inline-block; min-height: 48px; line-height: 48px; }
	.sub { margin: 0; color: var(--ink-2); }
	.reviewed { margin: 0.5rem 0 0; font-size: 0.9rem; color: var(--muted); }
	.card { background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--radius); box-shadow: var(--shadow); padding: 1rem 1.1rem; min-width: 0; }
	.card h2 { margin: 0 0 0.6rem; font-size: 1.15rem; }
	h3 { font-size: 1rem; margin: 0 0 0.4rem; }
	p, li { line-height: 1.5; }
	ul, ol { padding-left: 1.25rem; margin: 0.4rem 0; }
	li + li { margin-top: 0.3rem; }
	a { color: var(--accent-ink); }
	.small { font-size: 0.88rem; color: var(--ink-2); }
	.muted { color: var(--muted); }
	.urgent { border: 2px solid var(--bad-border); background: var(--bad-bg); }
	.urgent h2 { color: var(--bad); }
	.role { display: inline-block; min-width: 11rem; font-weight: 700; }
	.call-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 0.6rem; margin: 0.6rem 0; }
	.call { display: flex; flex-direction: column; gap: 0.15rem; min-height: 48px; padding: 0.7rem 0.9rem; border-radius: 8px; background: var(--bad); color: #fff; text-decoration: none; }
	.call .role { min-width: 0; font-size: 0.8rem; font-weight: 600; opacity: 0.9; }
	.call .name { font-weight: 700; }
	.call .phone { font-size: 1.15rem; font-weight: 700; font-variant-numeric: tabular-nums; }
	.call:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
	.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.6rem 0; }
	.btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 1rem; border-radius: 8px; border: 1px solid var(--hairline); background: var(--surface-2); color: var(--ink); text-decoration: none; font-weight: 600; }
	.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
	.toc ol { columns: 2; column-gap: 2rem; }
	.toc a { display: inline-block; padding: 0.15rem 0; }
	.step { border-left: 5px solid; border-radius: 6px; padding: 0.75rem 0.9rem; margin: 0.75rem 0; }
	.step.red { border-color: var(--bad); background: var(--bad-bg); }
	.step.amber { border-color: #d97706; background: var(--warn-bg); }
	.step.blue { border-color: var(--accent); background: var(--accent-wash); }
	.step.green { border-color: var(--good); background: var(--good-bg); }
	.step p { margin: 0.4rem 0; }
	.action { font-size: 1.02rem; }
	.next { font-weight: 600; color: var(--ink-2); }
	.notice { padding: 0.7rem 0.9rem; border-radius: 8px; background: var(--warn-bg); border: 1px solid var(--warn-border); color: #7c4a03; }
	.notice.bad { background: var(--bad-bg); border-color: var(--bad-border); color: var(--bad); font-weight: 600; }
	.scroll { overflow-x: auto; }
	table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
	th, td { text-align: left; vertical-align: top; padding: 0.5rem; border-bottom: 1px solid var(--grid); }
	th { background: var(--surface-2); }
	td:first-child { font-weight: 600; white-space: nowrap; }
	table.compact td { padding: 0.3rem 0.5rem; }
	tr.current { background: var(--accent-wash); }
	.tag { font-size: 0.75rem; background: var(--accent); color: #fff; border-radius: 999px; padding: 0.05rem 0.45rem; margin-left: 0.3rem; }
	.room-switch { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; margin: 0.75rem 0; }
	.room-switch button { min-height: 48px; border: 2px solid var(--hairline); border-radius: 8px; background: var(--surface-2); color: var(--ink); font: inherit; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.4rem; }
	.room-switch button span { font-size: 0.8rem; color: var(--ink-2); }
	.room-switch button.active { border-color: var(--accent); background: var(--accent-wash); }
	.room-title { margin-top: 0.5rem; }
	.ph-card { border: 2px solid var(--warn-border); background: var(--warn-bg); border-radius: 8px; padding: 0.6rem 0.8rem; }
	.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 1rem; margin-top: 1rem; }
	details { border-top: 1px solid var(--grid); padding: 0.5rem 0; }
	summary { cursor: pointer; font-weight: 600; min-height: 44px; display: flex; align-items: center; gap: 0.5rem; }
	.time { font-variant-numeric: tabular-nums; font-size: 0.8rem; color: var(--muted); font-weight: 600; margin-right: 0.35rem; }
	@media (max-width: 560px) {
		.toc ol { columns: 1; }
		.role { min-width: 0; display: block; }
		/* Stack the limits table so the actions stay readable on a phone. */
		table.limits thead { display: none; }
		table.limits tr { display: block; padding: 0.5rem 0; border-bottom: 1px solid var(--grid); }
		table.limits td { display: block; border: 0; padding: 0.15rem 0; }
		table.limits td:nth-child(2) { color: var(--accent-ink); font-weight: 600; }
	}
</style>
