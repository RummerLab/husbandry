export const MAX_SUBMISSION_BYTES = 128 * 1024;

export class RequestBodyError extends Error {
	constructor(public status: number, message: string) { super(message); }
}

/** Bound actual bytes, including streamed requests without Content-Length. */
export async function readSubmissionBody(request: Request): Promise<unknown> {
	if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
		throw new RequestBodyError(415, 'Send submissions as application/json.');
	}
	const length = request.headers.get('content-length');
	if (length && Number(length) > MAX_SUBMISSION_BYTES) throw new RequestBodyError(413, 'Submission exceeds the 128 KiB limit.');
	const reader = request.body?.getReader();
	if (!reader) throw new RequestBodyError(400, 'Invalid JSON.');
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_SUBMISSION_BYTES) {
				await reader.cancel();
				throw new RequestBodyError(413, 'Submission exceeds the 128 KiB limit.');
			}
			chunks.push(value);
		}
	} finally { reader.releaseLock(); }
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
	try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
	catch { throw new RequestBodyError(400, 'Invalid JSON.'); }
}
