<script lang="ts">
	import SiteHeader from '../../lib/components/SiteHeader.svelte';
</script>

<svelte:head>
	<title>Privacy · RummerLab Husbandry</title>
	<meta name="robots" content="noindex, nofollow, noarchive" />
</svelte:head>

<SiteHeader highlight="privacy" />

<div class="page">
	<header class="top">
		<h1>Privacy</h1>
		<p class="sub">What this app collects when husbandry records sync, and who can see it.</p>
	</header>

	<section class="card" aria-labelledby="notice">
		<h2 id="notice">Collection notice</h2>
		<p>
			When records sync, the server logs your IP address, approximate location (city/region/country), browser details and this device's ID, for security and audit of husbandry records. Only lab administrators can see this log; it is not part of the shared spreadsheet. Named lab administrators who sign in with Google can also view all submitted records in the <a href="/insights">Lab Overview</a>.
		</p>
		<p class="small">
			Each device still stores and shows only the records submitted from that physical device. Lab-wide spreadsheet data reaches the browser only for named administrators on the Lab Overview, and never includes the restricted request log.
		</p>
	</section>

	<p class="back"><a href="/">← Back to recording</a></p>
</div>

<style>
	.page {
		max-width: 880px;
		margin: 0 auto;
		padding: 1rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.top h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.sub {
		margin: 0.4rem 0 0;
		color: var(--ink-2);
	}
	.card {
		background: var(--surface);
		border: 1px solid var(--hairline);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 1rem 1.1rem;
		min-width: 0;
	}
	.card h2 {
		margin: 0 0 0.6rem;
		font-size: 1.15rem;
	}
	p {
		line-height: 1.5;
	}
	a {
		color: var(--accent-ink);
	}
	.small {
		font-size: 0.88rem;
		color: var(--ink-2);
	}
	.back {
		margin: 0;
	}
	.back a {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		font-weight: 600;
	}
</style>
