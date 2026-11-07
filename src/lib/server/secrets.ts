import { timingSafeEqual } from 'node:crypto';

/** Fixed-size comparison of server secrets; this is not a persisted password hash. */
export function sameSecret(actual: string, expected: string): boolean {
	const actualBytes = Buffer.from(actual);
	const expectedBytes = Buffer.from(expected);
	const limit = 4096;
	if (actualBytes.length > limit || expectedBytes.length > limit) return false;
	const left = Buffer.alloc(limit + 4);
	const right = Buffer.alloc(limit + 4);
	left.writeUInt32BE(actualBytes.length); right.writeUInt32BE(expectedBytes.length);
	actualBytes.copy(left, 4); expectedBytes.copy(right, 4);
	return timingSafeEqual(left, right);
}
