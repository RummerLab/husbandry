import { beforeEach, expect, it, vi } from 'vitest';
import { load } from '../src/routes/insights/+page.server';
import { getAdminConfig } from '../src/lib/server/adminAuth';
import { getReadonlyMasterSheet } from '../src/lib/server/sheets';
import { readMasterSheet, readTabIds } from '../src/lib/server/insights';

vi.mock('../src/lib/server/adminAuth', () => ({ getAdminConfig: vi.fn(() => ({})) }));
vi.mock('../src/lib/server/sheets', () => ({ getReadonlyMasterSheet: vi.fn(() => ({ sheets: {}, spreadsheetId: 'private-master' })) }));
vi.mock('../src/lib/server/insights', async importOriginal => ({
	...await importOriginal<typeof import('../src/lib/server/insights')>(),
	readMasterSheet: vi.fn(), readTabIds: vi.fn(async () => [])
}));

beforeEach(() => { vi.clearAllMocks(); });
const admin = { email: 'approved@example.test', name: 'Lab Admin', exp: 9999999999 };
async function request(user: typeof admin | null = admin) {
	const setHeaders = vi.fn();
	const result = await load({ locals: { admin: user }, url: new URL('https://lab.test/insights'), setHeaders } as unknown as Parameters<typeof load>[0]);
	expect(setHeaders).toHaveBeenCalledWith({ 'Cache-Control': 'private, no-store' });
	return result;
}

it('reads on each authorised request and never returns a cached overview after failure', async () => {
	const empty = { lss: [], tanksEggs: [], feeds: [], waterQuality: [] };
	vi.mocked(readMasterSheet).mockResolvedValue(empty);
	expect(await request()).toMatchObject({ state: 'loaded', signedIn: true });
	expect(await request()).toMatchObject({ state: 'loaded', signedIn: true });
	expect(readMasterSheet).toHaveBeenCalledTimes(2);
	expect(readTabIds).toHaveBeenCalledTimes(2);
	vi.mocked(readMasterSheet).mockRejectedValueOnce(new Error('Read failed'));
	expect(await request()).toMatchObject({ state: 'readFailed', overview: null, lookerCreateUrl: '' });
});

it('does not read or include admin-only links for absent, expired or revoked sessions', async () => {
	// hooks.server maps invalid/expired/revoked sessions to null before this boundary.
	for (let i = 0; i < 3; i++) {
		const result = await request(null);
		expect(result).toMatchObject({ state: 'signedOut', signedIn: false });
		expect(result).not.toHaveProperty('overview');
		expect(result).not.toHaveProperty('sheetUrl');
		expect(result).not.toHaveProperty('lookerCreateUrl');
	}
	expect(readMasterSheet).not.toHaveBeenCalled();
	expect(getReadonlyMasterSheet).not.toHaveBeenCalled();
	vi.mocked(getAdminConfig).mockReturnValueOnce(null);
	expect(await request(null)).toMatchObject({ state: 'unconfigured' });
});

it('represents an authorised but unconfigured source without making sheet calls', async () => {
	vi.mocked(getReadonlyMasterSheet).mockReturnValueOnce(null);
	expect(await request()).toMatchObject({ state: 'sourceUnconfigured', signedIn: true, overview: null });
	expect(readMasterSheet).not.toHaveBeenCalled();
});
