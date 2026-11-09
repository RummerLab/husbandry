/**
 * iOS never shows an install prompt (no `beforeinstallprompt` in Safari or Chrome on iPhone/iPad),
 * so the app explains "Add to Home Screen" itself (#71). Android/desktop Chrome keep their native prompt.
 */
export type IosBrowser = 'safari' | 'chrome' | 'other';
export const INSTALL_HINT_DISMISSED_KEY = 'rummerlab_install_hint_dismissed';

/** Which iOS instructions to show, or null when not iOS or already running as an installed app. */
export function iosInstallTarget(userAgent: string, maxTouchPoints: number, standalone: boolean): IosBrowser | null {
	const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1); // iPadOS reports as Mac
	if (!ios || standalone) return null;
	if (/CriOS/.test(userAgent)) return 'chrome';
	if (/FxiOS|EdgiOS|OPiOS|GSA\//.test(userAgent) || !/Safari\//.test(userAgent)) return 'other'; // other browsers and in-app webviews
	return 'safari';
}

export function isStandalone(win: Window): boolean {
	return (win.navigator as Navigator & { standalone?: boolean }).standalone === true || win.matchMedia?.('(display-mode: standalone)').matches === true;
}
