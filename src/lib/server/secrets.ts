import { createHash, timingSafeEqual } from 'node:crypto';

/** Compare fixed-length digests without exposing credential length timing. */
export function sameSecret(actual: string, expected: string): boolean {
	return timingSafeEqual(createHash('sha256').update(actual).digest(), createHash('sha256').update(expected).digest());
}
