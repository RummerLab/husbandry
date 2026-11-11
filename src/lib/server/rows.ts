import type { LSSData, TanksEggsData, FeedsData, WaterQualityData } from '../types';
import { ROOM12_TANKS } from '../tanksConfig';
import { NOT_MEASURED } from '../validation';
/** The animal welfare answer shares Col 20 so the LSS tab keeps its 21 operational columns. */
export function formatLSSConcerns(data: LSSData): string {
	const concerns = data.concerns?.trim() || '';
	if (data.animalsChecked !== 'Y' && data.animalsChecked !== 'N') return concerns;
	const check = `All animals sighted & normal: ${data.animalsChecked}`;
	return concerns ? `${check}. ${concerns}` : check;
}

export function formatLSSRow(data: LSSData): (string | number)[] {
	// Shift-part records leave the other shift's columns blank rather than inventing defaults.
	if (data.shiftPart) return formatLSSShiftRow(data);
	return [
		data.date,                          // Col 1: Date
		data.amInitials || '',              // Col 2: AM Initials
		data.pmInitials || '',              // Col 3: PM Initials
		data.skimmerVenturi || '/',         // Col 4: Protein Skimmer Venturi
		data.skimmerSprayDown || '/',       // Col 5: Protein Skimmer Spray down
		data.filterCleaned || 'N',          // Col 6: Filter canister Cleaned
		data.filterReplaced || '/',         // Col 7: Filter canister Replaced
		data.waterLevelsAM || 'Y',          // Col 8: Water levels sufficient AM
		data.waterLevelsPM || 'Y',          // Col 9: Water levels sufficient PM
		data.waterFlowAM || 'Y',            // Col 10: Water flow AM
		data.waterFlowPM || 'Y',            // Col 11: Water flow PM
		data.airstonesAM || 'Y',            // Col 12: Airstones AM
		data.airstonesPM || 'Y',            // Col 13: Airstones PM
		data.vacNetTanks || 'Y',            // Col 14: Vac + net tanks
		data.tanksScrubbed || '/',          // Col 15: Tanks scrubbed
		data.overflowCleaned || 'Y',        // Col 16: O/F cleaned
		data.hoseFloorLadder || 'Y',        // Col 17: Hose -> floor, ladder & tools
		data.footTubLidsSqueegee || 'Y',    // Col 18: Foot tub refilled, lids on, squeegeed
		data.equipmentDisinfected || 'Y',   // Col 19: Equipment disinfected
		formatLSSConcerns(data),            // Col 20: Concerns (new), prefixed with the daily animal check
		data.notes || ''                    // Col 21: Notes
	];
}

const LSS_CHECK_COLUMNS = ['skimmerVenturi', 'skimmerSprayDown', 'filterCleaned', 'filterReplaced', 'waterLevelsAM', 'waterLevelsPM', 'waterFlowAM', 'waterFlowPM', 'airstonesAM', 'airstonesPM', 'vacNetTanks', 'tanksScrubbed', 'overflowCleaned', 'hoseFloorLadder', 'footTubLidsSqueegee', 'equipmentDisinfected'] as const;

function formatLSSShiftRow(data: LSSData): (string | number)[] {
	return [
		data.date,                          // Col 1
		data.amInitials || '',              // Col 2
		data.pmInitials || '',              // Col 3
		...LSS_CHECK_COLUMNS.map(key => data[key] || ''), // Cols 4-19, same order as formatLSSRow
		formatLSSConcerns(data),            // Col 20
		data.notes || ''                    // Col 21
	];
}

export function formatTanksEggsRow(data: TanksEggsData): (string | number)[] {
	return [
		data.date,                          // Col 1: Date
		data.initials || '',                // Col 2: Initials
		data.palpationHO103 || '0',         // Col 3: HO103
		data.palpationHO102 || '0',         // Col 4: HO102
		data.palpationHO116 || '0',         // Col 5: HO116
		data.palpationHO105 || '0',         // Col 6: HO105
		data.palpationHO117 || '0',         // Col 7: HO117
		data.windEggs || '0',               // Col 8: Wind Eggs?
		data.newEggs || '0',                // Col 9: New Eggs
		data.newEggTag || '0',              // Col 10: New Egg Tag?
		data.newEmbryos || 'N',             // Col 11: New Embryos?
		data.candling || 'N',               // Col 12: Candling
		data.deadEggTag || '0',             // Col 13: Dead Egg Tag?
		data.foodRecordsEnteredPM || 'Y',   // Col 14: Food records entered? PM
		data.whatsappUpdateAM || 'Y',       // Col 15: Whatsapp update AM
		data.whatsappUpdatePM || 'Y',       // Col 16: Whatsapp update PM
		data.observationsNotes || '',       // Col 17: Observations/Notes
		data.moveDescription || '',         // Col 18: Description
		data.moveFrom || '',                // Col 19: From
		data.moveTo || '',                  // Col 20: To
		data.moveQty || ''                  // Col 21: QTY
	];
}

export function formatFeedsRow(data: FeedsData): (string | number)[] {
	// Total 84 columns matching Feeds sheet
	const row: (string | number)[] = [
		data.date,
		data.initials
	];

	for (const tank of ROOM12_TANKS) {
		const tankEntry = data.tanks[tank.id] || { amountFed: '', meds: {}, uneatenGrams: '' };

		// Fed amount for tank
		row.push(tankEntry.amountFed || '');

		// Animal columns & medications
		// If multiple animals in tank, the structure in the sheet has columns for each animal and medication flags
		if (tank.id === 'tank1') {
			row.push(''); // HO103 (F) placeholder in header
			row.push(tankEntry.meds['103'] || 'N'); // Elasmotab 103
			row.push(tankEntry.meds['107'] || 'N'); // Elasmotab 107
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank2_far_right') {
			row.push(''); // AM085 placeholder
			row.push(tankEntry.meds['84'] || 'N');
			row.push(tankEntry.meds['85'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank2_mid_right') {
			row.push(''); // AM081 placeholder
			row.push(tankEntry.meds['73'] || 'N');
			row.push(tankEntry.meds['81'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank2_mid_left') {
			row.push(''); // AM010 (F) placeholder
			row.push(tankEntry.meds['6'] || 'N');
			row.push(tankEntry.meds['10'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank2_far_left') {
			row.push(tankEntry.meds['76'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank3') {
			row.push('');
			row.push(tankEntry.meds['106'] || 'N');
			row.push(tankEntry.meds['116'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank4') {
			row.push('');
			row.push(tankEntry.meds['105'] || 'N');
			row.push(tankEntry.meds['110'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank5_green_lid') {
			row.push('');
			row.push(tankEntry.meds['123'] || 'N');
			row.push(tankEntry.meds['126'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank5_big_tub') {
			row.push('');
			row.push(tankEntry.meds['134'] || 'N');
			row.push(tankEntry.meds['135'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank5_egg_crate') {
			row.push('');
			row.push(tankEntry.meds['59'] || 'N');
			row.push(tankEntry.meds['77'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank6_big_tub_middle') {
			row.push('');
			row.push(tankEntry.meds['125'] || 'N');
			row.push(tankEntry.meds['147'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank6_green_lid') {
			row.push(tankEntry.meds['99'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'historic_tank6_green_lid') {
			row.push(tankEntry.meds['81'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank6_big_tub_right') {
			row.push('');
			row.push(tankEntry.meds["082'"] || 'N');
			row.push(tankEntry.meds['57'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank7_historic_tank2') {
			row.push('');
			row.push(tankEntry.meds['102'] || 'N');
			row.push(tankEntry.meds['109'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'historic_tank7') {
			row.push(tankEntry.meds['117'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		} else if (tank.id === 'tank8') {
			row.push('');
			row.push('');
			row.push('');
			row.push(tankEntry.meds['117'] || 'N');
			row.push(tankEntry.meds['119'] || 'N');
			row.push(tankEntry.meds['120'] || 'N');
			row.push(tankEntry.meds['121'] || 'N');
			row.push(tankEntry.uneatenGrams || '0');
		}
	}

	// Final Col 84: Notes/Observations
	row.push(data.notes || '');

	return row;
}

const measured = (value: string | undefined) => (value === NOT_MEASURED ? '' : value || '');

export function formatWaterQualityRow(data: WaterQualityData): (string | number)[] {
	return [
		data.date,                          // Col 1: DATE
		data.initials || '',                // Col 2: INITIALS
		data.tempA || '',                   // Col 3: Temp A
		data.tempB || '',                   // Col 4: Temp B
		measured(data.pHA),                     // Col 5: pH A
		measured(data.pHB),                     // Col 6: pH B
		data.salinityA || '',               // Col 7: Salinity A
		data.salinityB || '',               // Col 8: Salinity B
		data.doA || '/',                    // Col 9: DO % A
		data.doB || '/',                    // Col 10: DO % B
		(data.isWeeklyCheck ? measured(data.alkA) : ''),                   // Col 11: Alk A
		(data.isWeeklyCheck ? measured(data.alkB) : ''),                   // Col 12: Alk B
		(data.isWeeklyCheck ? measured(data.weeklypHA) : ''),              // Col 13: pH A (weekly)
		(data.isWeeklyCheck ? measured(data.weeklypHB) : ''),              // Col 14: pH B (weekly)
		(data.isWeeklyCheck ? measured(data.nh3A) : ''),                   // Col 15: Nh3 A
		(data.isWeeklyCheck ? measured(data.nh3B) : ''),                   // Col 16: Nh3 B
		(data.isWeeklyCheck ? measured(data.no2A) : ''),                   // Col 17: No2 A
		(data.isWeeklyCheck ? measured(data.no2B) : ''),                   // Col 18: No2 B
		(data.isWeeklyCheck ? measured(data.no3A) : ''),                    // Col 19: No3 A
		(data.isWeeklyCheck ? measured(data.no3B) : ''),                    // Col 20: No3 B
		(data.isWeeklyCheck ? measured(data.po4A) : ''),                   // Col 21: Po4 A
		(data.isWeeklyCheck ? measured(data.po4B) : ''),                   // Col 22: Po4 B
		data.notes || ''                    // Col 23: Notes
	];
}
