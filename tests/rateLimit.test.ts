import { afterEach, expect, it, vi } from 'vitest';
import { checkRateLimit } from '@vercel/firewall';
import { enforceRateLimit } from '../src/lib/server/rateLimit';
vi.mock('@vercel/firewall', () => ({ checkRateLimit: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const request = new Request('https://lab.test/api/submit', { method: 'POST' });
it('uses the managed trusted-IP rule and returns a JSON cooldown', async () => {
 vi.stubEnv('VERCEL', '1'); vi.stubEnv('RATE_LIMIT_MODE', 'enforce');
 vi.mocked(checkRateLimit).mockResolvedValue({ rateLimited: true });
 const response = (await enforceRateLimit(request, 'submit'))!;
 expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('60');
 expect(checkRateLimit).toHaveBeenCalledWith('husbandry-submit', { request, timeout: 1500 });
});
it('fails closed for missing rules, blocked checks and outages', async () => {
 vi.stubEnv('VERCEL', '1'); vi.stubEnv('RATE_LIMIT_MODE', 'enforce');
 for (const error of ['not-found', 'blocked'] as const) {
  vi.mocked(checkRateLimit).mockResolvedValue({ rateLimited: false, error });
  expect((await enforceRateLimit(request, 'submit'))?.status).toBe(503);
 }
 vi.mocked(checkRateLimit).mockRejectedValue(new Error('outage'));
 expect((await enforceRateLimit(request, 'submit'))?.status).toBe(503);
 vi.stubEnv('RATE_LIMIT_MODE', 'invalid'); expect((await enforceRateLimit(request, 'submit'))?.status).toBe(503);
});
it('supports explicit observation mode and separates optional verified identity buckets', async () => {
 vi.stubEnv('RATE_LIMIT_MODE', 'log'); vi.mocked(checkRateLimit).mockResolvedValue({ rateLimited: true });
 expect(await enforceRateLimit(request, 'login', 'verified-user')).toBeNull();
 expect(vi.mocked(checkRateLimit).mock.calls[0][0]).toBe('husbandry-login');
 expect(vi.mocked(checkRateLimit).mock.calls[0][1]?.rateLimitKey).toMatch(/^[a-f0-9]{64}$/);
});

it('does not break a deployment before rate-rule activation is configured', async () => {
 vi.stubEnv('VERCEL', '1'); vi.stubEnv('RATE_LIMIT_MODE', '');
 expect(await enforceRateLimit(request, 'submit')).toBeNull(); expect(checkRateLimit).not.toHaveBeenCalled();
});
