import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendSubmissionToSheets } from '../../../lib/server/sheets';
import type { FullHusbandrySubmission } from '../../../lib/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = (await request.json()) as FullHusbandrySubmission;

		if (!payload || !payload.date || !payload.modulesSubmitted || payload.modulesSubmitted.length === 0) {
			return json(
				{ success: false, error: 'Validation failed: Missing date or modules list.' },
				{ status: 400 }
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
