import { afterEach, expect, it, vi } from 'vitest';
import { format } from 'basic-auth';
import { checkLabAccess } from '../src/lib/server/access';
import { enforceRateLimit } from '../src/lib/server/rateLimit';
import { handle } from '../src/hooks.server';
vi.mock('../src/lib/server/rateLimit', () => ({ enforceRateLimit: vi.fn(async () => null) }));
const password = 'test-password-only-1234567890';
function config() { vi.stubEnv('VERCEL', '1'); vi.stubEnv('LAB_ACCESS_USERNAME', 'lab'); vi.stubEnv('LAB_ACCESS_PASSWORD', password); }
const request = (path = '/', pass = password, origin?: string) => new Request('https://lab.test' + path, { method: path === '/api/submit' ? 'POST' : 'GET', headers: { authorization: format({ name: 'lab', pass }), ...(origin ? { origin } : {}) } });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('requires deployed configuration and allows only local demos without it', async () => {
 vi.stubEnv('VERCEL', '1'); vi.stubEnv('LAB_ACCESS_PASSWORD', ''); expect((await checkLabAccess(new Request('https://lab.test/')))?.status).toBe(503);
 vi.stubEnv('VERCEL', ''); vi.stubEnv('NODE_ENV', 'test'); expect(await checkLabAccess(new Request('http://localhost/'))).toBeNull();
});
it('challenges page navigation while API rejection remains JSON without a redirect', async () => {
 config(); const page = (await checkLabAccess(request('/', 'wrong')))!; expect(page.status).toBe(401); expect(page.headers.get('www-authenticate')).toContain('Basic');
 const api = (await checkLabAccess(request('/api/submit', 'wrong')))!; expect(api.status).toBe(401); expect(api.headers.get('www-authenticate')).toBeNull(); expect(api.headers.get('location')).toBeNull();
 expect(await api.json()).toMatchObject({ code: 'AUTH_REQUIRED' }); expect(enforceRateLimit).toHaveBeenCalledWith(expect.any(Request), 'login');
});
it('enforces credentials and exact Origin on direct API calls across hostnames', async () => {
 config(); expect(await checkLabAccess(request('/api/submit', password, 'https://lab.test'))).toBeNull();
 expect((await checkLabAccess(request('/api/submit', password, 'https://evil.test')))?.status).toBe(403);
 expect((await checkLabAccess(request('/api/submit')))?.status).toBe(403);
 const alias = new Request('https://preview.vercel.app/api/submit', { method: 'POST' }); expect((await checkLabAccess(alias))?.status).toBe(401);
 vi.stubEnv('LAB_ACCESS_PASSWORD', 'rotated-password-1234567890'); expect((await checkLabAccess(request()))?.status).toBe(401);
});
it('does not resolve protected endpoints for rejected requests and keeps health public', async () => {
 config(); const resolve = vi.fn(async () => new Response('ok'));
 const event = { request: request('/api/submit', 'wrong'), url: new URL('https://lab.test/api/submit') };
 const response = await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);
 expect(response.status).toBe(401); expect(resolve).not.toHaveBeenCalled();
 expect(await checkLabAccess(new Request('https://lab.test/api/health'))).toBeNull();
 expect(await checkLabAccess(new Request('https://lab.test/api/health/diagnostics'))).toBeNull(); // Route has independent Bearer gate.
});
it('respects managed login throttling and rejects insecure deployed access', async () => {
 config(); vi.mocked(enforceRateLimit).mockResolvedValueOnce(new Response('limited', { status: 429 }));
 expect((await checkLabAccess(request('/', 'wrong')))?.status).toBe(429);
 expect((await checkLabAccess(new Request('http://lab.test/', { headers: { authorization: format({ name: 'lab', pass: password }) } })))?.status).toBe(403);
});
