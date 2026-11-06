import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { appendSubmissionToSheets } from '../../../lib/server/sheets';
import type { FullHusbandrySubmission } from '../../../lib/types';
import { ROOM12_TANKS } from '../../../lib/tanksConfig';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = (await request.json()) as FullHusbandrySubmission;

		if (!payload || !payload.date || !payload.modulesSubmitted || payload.modulesSubmitted.length === 0) {
			return json(
				{ success: false, error: 'Animal Ethics Validation: Missing date or modules list.' },
				{ status: 400 }
			);
		}

		// Comprehensive Server-Side Ethics Validation Guard
		const validationErrors: string[] = [];

		if (payload.modulesSubmitted.includes('lss')) {
			const lss = payload.lss;
			if (!lss) {
				validationErrors.push('LSS dataset missing');
			} else {
				if (!lss.amInitials?.trim()) validationErrors.push('LSS: AM Initials required');
				if (!lss.skimmerVenturi) validationErrors.push('LSS: Protein Skimmer Venturi required');
				if (!lss.skimmerSprayDown) validationErrors.push('LSS: Protein Skimmer Spray down required');
				if (!lss.filterCleaned) validationErrors.push('LSS: Filter Canister Cleaned required');
				if (!lss.waterLevelsAM || !lss.waterLevelsPM) validationErrors.push('LSS: Water levels AM/PM required');
				if (!lss.waterFlowAM || !lss.waterFlowPM) validationErrors.push('LSS: Water flow AM/PM required');
				if (!lss.airstonesAM || !lss.airstonesPM) validationErrors.push('LSS: Airstones AM/PM required');
				if (!lss.vacNetTanks) validationErrors.push('LSS: Vac + net tanks required');
				if (!lss.footTubLidsSqueegee) validationErrors.push('LSS: Foot tub & lids check required');
			}
		}

		if (payload.modulesSubmitted.includes('tanksEggs')) {
			const te = payload.tanksEggs;
			if (!te) {
				validationErrors.push('Tanks + Eggs dataset missing');
			} else {
				if (!te.initials?.trim()) validationErrors.push('Tanks & Eggs: Observer initials required');
				if (!te.palpationHO103 || !te.palpationHO102 || !te.palpationHO116 || !te.palpationHO105 || !te.palpationHO117) {
					validationErrors.push('Tanks & Eggs: All female palpations (0/L/R/B) required');
				}
				if (!te.candling) validationErrors.push('Tanks & Eggs: Candling check required');
				if (!te.foodRecordsEnteredPM) validationErrors.push('Tanks & Eggs: Food records confirmation required');
				if (!te.whatsappUpdateAM || !te.whatsappUpdatePM) validationErrors.push('Tanks & Eggs: WhatsApp updates AM/PM required');
			}
		}

		if (payload.modulesSubmitted.includes('feeds')) {
			const feeds = payload.feeds;
			if (!feeds) {
				validationErrors.push('Feeds dataset missing');
			} else {
				if (!feeds.initials?.trim()) validationErrors.push('Feeds: Feeder initials required');
				for (const tank of ROOM12_TANKS) {
					const entry = feeds.tanks?.[tank.id];
					if (!entry || !entry.amountFed?.trim()) {
						validationErrors.push(`Feeds: Missing feed amount for ${tank.name}`);
					}
					if (!entry || !entry.uneatenGrams?.trim()) {
						validationErrors.push(`Feeds: Missing uneaten amount for ${tank.name}`);
					}
				}
			}
		}

		if (payload.modulesSubmitted.includes('waterQuality')) {
			const wq = payload.waterQuality;
			if (!wq) {
				validationErrors.push('Water Quality dataset missing');
			} else {
				if (!wq.initials?.trim()) validationErrors.push('Water Quality: Analyst initials required');
				if (!wq.tempA?.trim() || !wq.tempB?.trim()) validationErrors.push('Water Quality: Temp A & B required');
				if (!wq.pHA?.trim() || !wq.pHB?.trim()) validationErrors.push('Water Quality: pH A & B required');
				if (!wq.salinityA?.trim() || !wq.salinityB?.trim()) validationErrors.push('Water Quality: Salinity A & B required');
			}
		}

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
