import type { Module } from './validation';
import type { LSSData, TanksEggsData, FeedsData, WaterQualityData, Room6Data } from './types';

export type HusbandryForms = { lss: LSSData; tanksEggs: TanksEggsData; feeds: FeedsData; waterQuality: WaterQualityData; room6: Room6Data };

/** Fresh unanswered observations for a new record; only saved initials are reused. */
export function createEmptyForms(date: string, initials = ''): HusbandryForms {
	return {
		lss: {
			date,
			amInitials: initials,
			pmInitials: '',
			animalsChecked: '',
			skimmerVenturi: '',
			skimmerSprayDown: '',
			filterCleaned: '',
			filterReplaced: '',
			waterLevelsAM: '',
			waterLevelsPM: '',
			waterFlowAM: '',
			waterFlowPM: '',
			airstonesAM: '',
			airstonesPM: '',
			vacNetTanks: '',
			tanksScrubbed: '',
			overflowCleaned: '',
			hoseFloorLadder: '',
			footTubLidsSqueegee: '',
			equipmentDisinfected: '',
			concerns: '',
			notes: ''
		},
		tanksEggs: {
			date,
			initials,
			palpationHO103: '',
			palpationHO102: '',
			palpationHO116: '',
			palpationHO105: '',
			palpationHO117: '',
			windEggs: '',
			newEggs: '',
			newEggTag: '',
			newEmbryos: '',
			candling: '',
			deadEggTag: '',
			foodRecordsEnteredPM: '',
			whatsappUpdateAM: '',
			whatsappUpdatePM: '',
			observationsNotes: '',
			moveDescription: '',
			moveFrom: '',
			moveTo: '',
			moveQty: ''
		},
		feeds: {
			date,
			initials,
			tanks: {},
			notes: ''
		},
		waterQuality: {
			date,
			initials,
			isWeeklyCheck: false,
			tempA: '',
			tempB: '',
			pHA: '',
			pHB: '',
			salinityA: '',
			salinityB: '',
			doA: '',
			doB: '',
			notes: ''
		},
		room6: {
			date,
			initials,
			eggsChecked: '',
			deadEggsRemoved: '',
			temp: '',
			salinity: '',
			pH: '',
			waterChange: '',
			concerns: '',
			notes: ''
		}
	};
}

/** Replacing only submitted modules preserves other observations during single-section saves. */
export function resetSubmittedForms(current: HusbandryForms, submitted: Module[], date: string, initials: string): HusbandryForms {
	const fresh = createEmptyForms(date, initials);
	return {
		lss: submitted.includes('lss') ? fresh.lss : current.lss,
		tanksEggs: submitted.includes('tanksEggs') ? fresh.tanksEggs : current.tanksEggs,
		feeds: submitted.includes('feeds') ? fresh.feeds : current.feeds,
		waterQuality: submitted.includes('waterQuality') ? fresh.waterQuality : current.waterQuality,
		room6: submitted.includes('room6') ? fresh.room6 : current.room6
	};
}

/** A fresh LSS record for one shift: AM keeps the daily welfare check; PM covers equipment and hygiene. */
export function createLSSPart(part: 'AM' | 'PM', date: string, initials = ''): LSSData {
	const lss = createEmptyForms(date).lss;
	return part === 'AM' ? { ...lss, shiftPart: 'AM', amInitials: initials } : { ...lss, shiftPart: 'PM', pmInitials: initials };
}
