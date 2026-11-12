import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('footer layout and privacy notice styling', () => {
	const pagePath = resolve(__dirname, '../src/routes/+page.svelte');
	const pageSource = readFileSync(pagePath, 'utf8');

	it('ensures .app-footer uses flex centering to align all footer children', () => {
		expect(pageSource).toMatch(/\.app-footer\s*\{[^}]*display:\s*flex;/);
		expect(pageSource).toMatch(/\.app-footer\s*\{[^}]*flex-direction:\s*column;/);
		expect(pageSource).toMatch(/\.app-footer\s*\{[^}]*align-items:\s*center;/);
	});

	it('ensures .app-footer p uses auto horizontal margins to avoid overriding child centering', () => {
		const footerPMatch = pageSource.match(/\.app-footer\s+p\s*\{([^}]+)\}/);
		expect(footerPMatch).toBeTruthy();
		const footerPBody = footerPMatch![1];
		expect(footerPBody).toMatch(/margin:\s*0\.3rem\s+auto;/);
		expect(footerPBody).not.toMatch(/margin:\s*0\.3rem\s+0;/);
	});

	it('ensures privacy note selector matches or exceeds .app-footer p specificity with centered margins', () => {
		expect(pageSource).toMatch(/\.app-footer\s+p\.privacy-note/);
		const privacyMatch = pageSource.match(/(?:\.app-footer\s+p\.privacy-note[^{]*)\{([^}]+)\}/);
		expect(privacyMatch).toBeTruthy();
		const privacyBody = privacyMatch![1];
		expect(privacyBody).toMatch(/margin:\s*0\.75rem\s+auto\s+0;/);
		expect(privacyBody).toMatch(/text-align:\s*center;/);
		expect(privacyBody).toMatch(/max-width:\s*46rem;/);
	});

	it('preserves the required privacy and request-log wording (#54, #66)', () => {
		expect(pageSource).toContain('when records sync, the server logs your IP address, approximate location (city/region/country), browser details and this device\'s ID');
		expect(pageSource).toContain('Only lab administrators can see this log; it is not part of the shared spreadsheet.');
		expect(pageSource).toContain('Named lab administrators who sign in with Google can also view all submitted records in the Lab Overview.');
	});
});
