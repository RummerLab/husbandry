import { expect, it } from 'vitest';
import { iosInstallTarget } from '../src/lib/installHint';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1';
const FIREFOX = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15';
const WEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPADOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

it('shows the right Add to Home Screen steps on iPhone and iPad only', () => {
	expect(iosInstallTarget(SAFARI, 5, false)).toBe('safari');
	expect(iosInstallTarget(CHROME, 5, false)).toBe('chrome');
	expect(iosInstallTarget(FIREFOX, 5, false)).toBe('other');
	expect(iosInstallTarget(WEBVIEW, 5, false)).toBe('other');
	expect(iosInstallTarget(IPADOS, 5, false)).toBe('safari');
	expect(iosInstallTarget(IPADOS, 0, false)).toBeNull(); // a real Mac
	expect(iosInstallTarget(ANDROID, 5, false)).toBeNull(); // Android keeps Chrome's native install prompt
});

it('hides the hint once the app is installed (standalone)', () => {
	expect(iosInstallTarget(SAFARI, 5, true)).toBeNull();
	expect(iosInstallTarget(CHROME, 5, true)).toBeNull();
});
