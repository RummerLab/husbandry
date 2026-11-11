import { enforceRateLimit } from '../../../lib/server/rateLimit';
import { randomUUID } from 'node:crypto';
import { readSubmissionBody, RequestBodyError } from '../../../lib/server/requestBody';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendSubmissionToSheets } from '../../../lib/server/sheets';
import { collectRequestContext } from '../../../lib/server/requestLog';
import type { FullHusbandrySubmission } from '../../../lib/types';
import { validateSubmission } from '../../../lib/validation';
import { SubmissionConflictError } from '../../../lib/server/submissionErrors';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const limited = await enforceRateLimit(request, 'submit');
	if (limited) return limited;
	try {
		let payload: FullHusbandrySubmission;
		payload = await readSubmissionBody(request) as FullHusbandrySubmission;

		const validationErrors = validateSubmission(payload);

		if (validationErrors.length > 0) {
			return json(
				{
					success: false,
					error: `Ethics Compliance Rejection: Incomplete criteria detected (${validationErrors.length} issues). Every field must be completed to submit.`,
					details: validationErrors
				},
				{ status: 422 }
			);
		}

		const result = await appendSubmissionToSheets(payload, collectRequestContext(request, getClientAddress));

		return json({
			success: true,
			id: payload.id,
			mode: result.mode,
			message: result.message,
			tabsUpdated: result.tabsUpdated,
			timestamp: new Date().toISOString()
		});
	} catch (err: unknown) {
		if (err instanceof SubmissionConflictError) return json({ success: false, code: 'SUBMISSION_CONFLICT', error: 'This saved record needs administrator review before sync. Its submission ID already belongs to different data. Keep the original device record.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
		if (err instanceof RequestBodyError) return json({ success: false, error: err.message }, { status: err.status });
		const correlationId = randomUUID();
		// Avoid logging provider request objects, credentials, or raw observations.
		console.error('Submission failed', { correlationId, errorType: err instanceof Error ? err.name : 'UnknownError' });
		return json({ success: false, code: 'SUBMISSION_FAILED', error: 'Submission could not be synced. Keep this record queued and contact the lab administrator if the problem continues.', correlationId }, { status: 503, headers: { 'Retry-After': '60' } });
	}
};
