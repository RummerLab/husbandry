import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkLabAccess, isPublicRoute } from '../src/lib/server/access';

vi.mock('../src/lib/server/rateLimit', () => ({ enforceRateLimit: vi.fn(async () => null) }));

const llmsPath = resolve(__dirname, '../static/llms.txt');
const content = readFileSync(llmsPath, 'utf8');
const siteLinks = [...content.matchAll(/https:\/\/husbandry\.rummerlab\.com(\/[^\s)]*)?/g)].map((match) => match[1] ?? '/');
const repoLinks = [...content.matchAll(/https:\/\/github\.com\/RummerLab\/husbandry\/blob\/main\/([^\s)]+)/g)].map((match) => match[1]);

describe('llms.txt site summary', () => {
	it('follows the llms.txt shape with a title and a summary blockquote', () => {
		const lines = content.split(/\r?\n/);
		expect(lines[0]).toBe('# RummerLab Husbandry');
		expect(lines.some((line) => /^> \S/.test(line))).toBe(true);
		expect(content).toMatch(/^## Pages$/m);
		expect(content).toMatch(/^## Guidance for AI assistants$/m);
	});

	it('only links to pages that exist in this repository', () => {
		expect(siteLinks.length).toBeGreaterThan(3);
		for (const link of siteLinks) {
			const path = link.split(/[?#]/)[0];
			const clean = path.replace(/^\/+|\/+$/g, '');
			const routeDir = resolve(__dirname, '../src/routes', clean);
			const exists = ['+page.svelte', '+server.ts', '+layout.svelte'].some((file) => existsSync(resolve(routeDir, file)))
				|| existsSync(resolve(__dirname, '../static', clean));
			expect(exists, `llms.txt links to missing route ${path}`).toBe(true);
		}
	});

	it('only links to documentation that exists in this repository', () => {
		expect(repoLinks.length).toBeGreaterThan(3);
		for (const file of repoLinks) {
			expect(existsSync(resolve(__dirname, '..', file)), `llms.txt links to missing document ${file}`).toBe(true);
		}
	});

	it('never exposes credentials, spreadsheet identifiers, or personal contact details', () => {
		expect(content).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
		expect(content).not.toMatch(/docs\.google\.com|spreadsheets\/d\//i);
		expect(content).not.toMatch(/BEGIN [A-Z ]*PRIVATE KEY|GOOGLE_PRIVATE_KEY|GOOGLE_SHEET_ID|GOOGLE_SERVICE_ACCOUNT/);
		expect(content).not.toMatch(/tel:|\+61\s?\d/);
		expect(content).not.toMatch(/\bTODO\b|\bTBD\b|\bFIXME\b/);
	});

	it('is described as private and discourages crawling of records', () => {
		expect(content).toMatch(/private/i);
		expect(content).toMatch(/robots\.txt/);
		expect(content).toMatch(/confidential/i);
	});
});

describe('llms.txt availability', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('serves /llms.txt without lab access authentication', async () => {
		expect(isPublicRoute('/llms.txt')).toBe(true);

		vi.stubEnv('LAB_ACCESS_ENABLED', 'true');
		vi.stubEnv('RATE_LIMIT_MODE', 'enforce');
		vi.stubEnv('VERCEL', '1');
		vi.stubEnv('LAB_ACCESS_USERNAME', 'lab');
		vi.stubEnv('LAB_ACCESS_PASSWORD', 'test-password-only-1234567890');

		expect(await checkLabAccess(new Request('https://lab.test/llms.txt'))).toBeNull();
	});
});
