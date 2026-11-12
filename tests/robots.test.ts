import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../src/hooks.server';
import { checkLabAccess, isPublicRoute } from '../src/lib/server/access';

vi.mock('../src/lib/server/rateLimit', () => ({ enforceRateLimit: vi.fn(async () => null) }));

describe('search engine and crawler exclusion', () => {
	it('disallows crawling across all user-agents in robots.txt', () => {
		const robotsPath = resolve(__dirname, '../static/robots.txt');
		const content = readFileSync(robotsPath, 'utf8');
		expect(content).toMatch(/User-agent:\s*\*/);
		expect(content).toMatch(/Disallow:\s*\//);
		expect(content).not.toMatch(/Disallow:\s*$/m);
	});

	it('includes a global noindex, nofollow, noarchive robots meta tag in app.html', () => {
		const appHtmlPath = resolve(__dirname, '../src/app.html');
		const content = readFileSync(appHtmlPath, 'utf8');
		expect(content).toMatch(/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow,\s*noarchive["']\s*\/?>/i);
	});

	it('includes noarchive in the route-level meta tags for help and insights', () => {
		const helpPath = resolve(__dirname, '../src/routes/help/+page.svelte');
		const helpContent = readFileSync(helpPath, 'utf8');
		expect(helpContent).toMatch(/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow,\s*noarchive["']\s*\/?>/i);

		const insightsPath = resolve(__dirname, '../src/routes/insights/+page.svelte');
		const insightsContent = readFileSync(insightsPath, 'utf8');
		expect(insightsContent).toMatch(/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow,\s*noarchive["']\s*\/?>/i);
	});

	it('serves /robots.txt publicly without requiring lab access authentication', async () => {
		expect(isPublicRoute('/robots.txt')).toBe(true);

		vi.stubEnv('LAB_ACCESS_ENABLED', 'true');
		vi.stubEnv('RATE_LIMIT_MODE', 'enforce');
		vi.stubEnv('VERCEL', '1');
		vi.stubEnv('LAB_ACCESS_USERNAME', 'lab');
		vi.stubEnv('LAB_ACCESS_PASSWORD', 'test-password-only-1234567890');

		const denied = await checkLabAccess(new Request('https://lab.test/robots.txt'));
		expect(denied).toBeNull();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('injects X-Robots-Tag header on normal responses and denied access responses', async () => {
		// Normal response
		const resolve = vi.fn(async () => new Response('OK', { status: 200 }));
		const event = {
			request: new Request('https://lab.test/'),
			url: new URL('https://lab.test/'),
			cookies: { get: () => undefined },
			locals: {} as Record<string, unknown>
		};
		const response = await handle({ event, resolve } as unknown as Parameters<typeof handle>[0]);
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');

		// Denied access response (401)
		vi.stubEnv('LAB_ACCESS_ENABLED', 'true');
		vi.stubEnv('RATE_LIMIT_MODE', 'enforce');
		vi.stubEnv('VERCEL', '1');
		vi.stubEnv('LAB_ACCESS_USERNAME', 'lab');
		vi.stubEnv('LAB_ACCESS_PASSWORD', 'test-password-only-1234567890');

		const unauthEvent = {
			request: new Request('https://lab.test/'),
			url: new URL('https://lab.test/'),
			cookies: { get: () => undefined },
			locals: {} as Record<string, unknown>
		};
		const unauthResponse = await handle({ event: unauthEvent, resolve } as unknown as Parameters<typeof handle>[0]);
		expect(unauthResponse.status).toBe(401);
		expect(unauthResponse.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
	});
});
