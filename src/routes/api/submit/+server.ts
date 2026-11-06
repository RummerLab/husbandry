import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendSubmissionToSheets } from '../../../lib/server/sheets';
import type { FullHusbandrySubmission } from '../../../lib/types';
import { validateSubmission } from '../../../lib/validation';

export const POST: RequestHandler = async ({ request }) => {
	try {
		let payload: FullHusbandrySubmission;
		try { payload = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

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

		const result = await appendSubmissionToSheets(payload);

		return json({
			success: true,
			id: payload.id,
			mode: result.mode,
			message: result.message,
			tabsUpdated: result.tabsUpdated,
			timestamp: new Date().toISOString()
		});
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
		console.error('Error submitting husbandry record:', err);
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
};
