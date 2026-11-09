import { describe, expect, it } from 'vitest';
import { createOAuthState, createSession, getAdminConfig, googleAuthUrl, parseAdminEmails, readOAuthState, readSession, safeReturnTo, SESSION_SECONDS } from '../src/lib/server/adminAuth';
import { buildOverview, feedColumns, missingDailyChecks, normaliseDate, summariseConcerns, summariseEggActivity, summariseFeeding, summarisePalpation, summariseWaterQuality } from '../src/lib/server/insights';
import { formatFeedsRow, formatLSSRow, formatTanksEggsRow, formatWaterQualityRow } from '../src/lib/server/rows';
import { createEmptyForms } from '../src/lib/formDefaults';
import { createOfflineCache } from '../src/lib/offlineCache';
import { ROOM12_TANKS } from '../src/lib/tanksConfig';

const SECRET = 'x'.repeat(40);
const env = { GOOGLE_OAUTH_CLIENT_ID: 'client.apps.googleusercontent.com', GOOGLE_OAUTH_CLIENT_SECRET: 'secret', AUTH_SECRET: SECRET, INSIGHTS_ADMIN_EMAILS: 'JodieRummer@gmail.com, emily@example.org' };

describe('administrator sign-in', () => {
	it('is off unless fully configured with a long secret and at least one admin', () => {
		expect(getAdminConfig(env)?.admins).toEqual(new Set(['jodierummer@gmail.com', 'emily@example.org']));
		expect(getAdminConfig({ ...env, AUTH_SECRET: 'short' })).toBeNull();
		expect(getAdminConfig({ ...env, INSIGHTS_ADMIN_EMAILS: '' })).toBeNull();
		expect(getAdminConfig({ ...env, GOOGLE_OAUTH_CLIENT_SECRET: '' })).toBeNull();
		expect(parseAdminEmails('a@b.co; not-an-email\nc@d.org')).toEqual(new Set(['a@b.co', 'c@d.org']));
	});

	it('accepts only signed, unexpired sessions for emails still on the allowlist', () => {
		const config = getAdminConfig(env)!;
		const now = Date.parse('2026-11-09T00:00:00Z');
		const cookie = createSession('JodieRummer@gmail.com', 'Jodie', SECRET, now);
		expect(readSession(cookie, config, now)?.email).toBe('jodierummer@gmail.com');
		expect(readSession(cookie, config, now + SESSION_SECONDS * 1000 + 1)).toBeNull();
		expect(readSession(cookie.replace(/.$/, c => (c === 'A' ? 'B' : 'A')), config, now)).toBeNull();
		expect(readSession(createSession('jodierummer@gmail.com', 'J', 'y'.repeat(40), now), config, now)).toBeNull();
		const revoked = getAdminConfig({ ...env, INSIGHTS_ADMIN_EMAILS: 'emily@example.org' });
		expect(readSession(cookie, revoked, now)).toBeNull();
		expect(readSession(cookie, null, now)).toBeNull();
	});

	it('binds the OAuth callback to the state cookie and uses PKCE', () => {
		const config = getAdminConfig(env)!;
		const { cookie, state, challenge } = createOAuthState(SECRET, '/insights');
		expect(readOAuthState(cookie, state, SECRET)?.verifier).toBeTruthy();
		expect(readOAuthState(cookie, 'other-state', SECRET)).toBeNull();
		expect(readOAuthState(cookie, state, SECRET, Date.now() + 11 * 60 * 1000)).toBeNull();
		const url = new URL(googleAuthUrl(config, 'https://husbandry.rummerlab.com/auth/google/callback', state, challenge));
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('scope')).toBe('openid email profile');
	});

	it('never redirects off-site after sign-in', () => {
		expect(safeReturnTo('/insights')).toBe('/insights');
		for (const bad of ['https://evil.example', '//evil.example', '/\\evil', '', null]) expect(safeReturnTo(bad)).toBe('/insights');
	});
});

// Build sheet rows with the app's own formatters so the overview reads exactly what the app writes.
const forms = (date: string) => createEmptyForms(date, 'TT');
function wqRow(date: string, values: Record<string, string>) {
	return formatWaterQualityRow({ ...forms(date).waterQuality, tempA: '27', tempB: '27.2', pHA: '8.1', pHB: '8.2', salinityA: '35', salinityB: '35', doA: '95', doB: '96', ...values }).map(String);
}

describe('lab overview summaries', () => {
	const today = '2026-11-09';

	it('reads app and Australian sheet dates', () => {
		expect(normaliseDate('2026-11-09')).toBe('2026-11-09');
		expect(normaliseDate('9/11/2026')).toBe('2026-11-09');
		expect(normaliseDate('Monday')).toBeNull();
	});

	it('summarises recent water quality and flags out-of-range readings', () => {
		const rows = [wqRow('2026-11-09', { tempA: '31' }), wqRow('2026-11-08', { isWeeklyCheck: true as unknown as string, alkA: '120', alkB: '118', weeklypHA: '8.2', weeklypHB: '8.2', nh3A: '0.25', nh3B: '0', no2A: '0', no2B: '0', no3A: '10', no3B: '12', po4A: '0.5', po4B: '0.4' }), wqRow('2026-10-01', {})];
		const wq = summariseWaterQuality(rows, today);
		expect(wq.map(d => d.date)).toEqual(['2026-11-09', '2026-11-08']);
		expect(wq[0].readings.tempA).toMatchObject({ value: 31, flagged: true });
		expect(wq[0].readings.tempB.flagged).toBe(false);
		expect(wq[1].weekly).toBe(true);
		expect(wq[1].readings.nh3A.flagged).toBe(true);
		expect(wq[1].readings.doA.value).toBe(95);
	});

	it('reports each female’s latest palpation and when she last held eggs', () => {
		const row = (date: string, values: Record<string, string>) => formatTanksEggsRow({ ...forms(date).tanksEggs, ...values }).map(String);
		const rows = [row('2026-11-01', { palpationHO103: 'L' }), row('2026-11-09', { palpationHO103: '0', palpationHO117: 'B' }), row('2026-11-05', { palpationHO103: 'R' })];
		const p = summarisePalpation(rows);
		expect(p.find(f => f.female === 'HO103')).toMatchObject({ latest: '0', latestDate: '2026-11-09', lastEggsDate: '2026-11-05', lastEggs: 'R' });
		expect(p.find(f => f.female === 'HO117')).toMatchObject({ latest: 'B', lastEggsDate: '2026-11-09' });
	});

	it('lists egg activity, moves and LSS concerns, and finds days missing a daily check', () => {
		const te = (date: string, values: Record<string, string>) => formatTanksEggsRow({ ...forms(date).tanksEggs, ...values }).map(String);
		const eggs = summariseEggActivity([te('2026-11-09', { newEggs: '2', newEggTag: 'E12' }), te('2026-11-08', {}), te('2026-11-07', { moveDescription: 'Pup', moveFrom: 'T1', moveTo: 'T3', moveQty: '1' })], today);
		expect(eggs.map(e => e.date)).toEqual(['2026-11-09', '2026-11-07']);
		expect(eggs[1].move).toBe('Pup from T1 to T3 ×1');
		const lss = (date: string, values: Record<string, string>) => formatLSSRow({ ...forms(date).lss, ...values }).map(String);
		const concerns = summariseConcerns([lss('2026-11-09', { animalsChecked: 'N', concerns: 'HO105 lethargic' }), lss('2026-11-08', { animalsChecked: 'Y' })], today);
		expect(concerns).toEqual([{ date: '2026-11-09', initials: 'TT', animalsNormal: 'N', text: 'HO105 lethargic', notes: '' }]);
		expect(missingDailyChecks([lss('2026-11-09', {}), lss('2026-11-07', {})], today, 3)).toEqual(['2026-11-08']);
	});

	it('finds every tank’s fed and uneaten columns from the real Feeds layout', () => {
		const cols = feedColumns();
		expect(cols).toHaveLength(ROOM12_TANKS.length);
		for (const c of cols) { expect(c.fed).toBeGreaterThan(1); expect(c.uneaten).toBeGreaterThan(c.fed); }
		expect(new Set(cols.flatMap(c => [c.fed, c.uneaten])).size).toBe(cols.length * 2);
	});

	it('flags tanks that ate nothing on two or more recent days', () => {
		const feed = (date: string, fed: string, uneaten: string) => formatFeedsRow({ date, initials: 'TT', notes: '', tanks: Object.fromEntries(ROOM12_TANKS.map(t => [t.id, { amountFed: t.id === 'tank1' ? fed : '10', meds: {}, uneatenGrams: t.id === 'tank1' ? uneaten : '2' }])) }).map(String);
		const feeding = summariseFeeding([feed('2026-11-09', '10', '10'), feed('2026-11-08', '0', '0'), feed('2026-11-07', '10', '4')], today);
		const tank1 = feeding.find(t => t.id === 'tank1')!;
		expect(tank1.days.map(d => d.eaten)).toEqual([0, 0, 6]);
		expect(tank1.flagged).toBe(true);
		expect(feeding.find(t => t.id !== 'tank1')!.flagged).toBe(false);
	});

	it('builds a full overview from an empty sheet without errors', () => {
		const o = buildOverview({ lss: [], tanksEggs: [], feeds: [], waterQuality: [] }, today);
		expect(o.missingDailyChecks).toHaveLength(14);
		expect(o.waterQuality).toEqual([]);
	});
});

it('never serves the Lab Overview or sign-in from the offline cache', () => {
	const cache = createOfflineCache({} as CacheStorage, fetch, 'https://husbandry.rummerlab.com', 'v1', []);
	const nav = (path: string) => ({ method: 'GET', mode: 'navigate', url: `https://husbandry.rummerlab.com${path}` }) as Request;
	expect(cache.handles(nav('/insights'))).toBe(false);
	expect(cache.handles(nav('/auth/google/callback?code=x'))).toBe(false);
	expect(cache.handles(nav('/'))).toBe(true);
});

it('builds a Looker Studio create link with one data source per tab', async () => {
	const { lookerStudioCreateUrl } = await import('../src/lib/server/insights');
	const url = new URL(lookerStudioCreateUrl('SHEET', [{ title: 'Water Quality', sheetId: 7 }, { title: 'Feeds', sheetId: 9 }]));
	expect(url.origin + url.pathname).toBe('https://lookerstudio.google.com/reporting/create');
	expect(url.searchParams.get('ds.ds0.worksheetId')).toBe('7');
	expect(url.searchParams.get('ds.ds1.datasourceName')).toBe('Feeds');
	expect(url.searchParams.get('ds.ds1.spreadsheetId')).toBe('SHEET');
});
