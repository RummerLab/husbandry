import type { Module } from './validation';
import type { LSSData, TanksEggsData, FeedsData, WaterQualityData, Room6Data, Room6EggChecksData, Room6WaterQualityData, Room6LssData, Room6AmmoniaData } from './types';
import { ROOM6_TANK_TASK_KEYS } from './room6Config';

export type HusbandryForms = { lss: LSSData; tanksEggs: TanksEggsData; feeds: FeedsData; waterQuality: WaterQualityData; room6: Room6Data; room6Eggs: Room6EggChecksData; room6WaterQuality: Room6WaterQualityData; room6Lss: Room6LssData; room6Ammonia: Room6AmmoniaData };

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
			routineIncluded: true,
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
		},
		room6Eggs: { date, initials, candling: '', windCount: '', windIds: '', newCount: '', newIds: '', embryoCount: '', embryoIds: '', deadCount: '', deadIds: '', notes: '' },
		room6WaterQuality: { date, initials, temp: '', pH: '', salinity: '', dissolvedOxygen: '', alk: '', weeklypH: '', nh3: '', no2: '', no3: '', po4: '', notes: '' },
		room6Lss: {
			date, initials,
			...Object.fromEntries(ROOM6_TANK_TASK_KEYS.map(key => [key, ''])),
			sumpWaterChange: '', sumpTopUp: '', sumpVac: '', biofilterClean: '',
			biofilterFlowAir: '', biofilterFlowWater: '', tankFlowAir: '', tankFlowWater: '',
			gutterVac: '', gutterScrub: '', notes: ''
		},
		room6Ammonia: { date, time: '', initials, ammonia: '', nitrite: '', notes: '' }
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
		room6: submitted.includes('room6') ? fresh.room6 : current.room6,
		room6Eggs: submitted.includes('room6Eggs') ? fresh.room6Eggs : current.room6Eggs,
		room6WaterQuality: submitted.includes('room6WaterQuality') ? fresh.room6WaterQuality : current.room6WaterQuality,
		room6Lss: submitted.includes('room6Lss') ? fresh.room6Lss : current.room6Lss,
		room6Ammonia: submitted.includes('room6Ammonia') ? fresh.room6Ammonia : current.room6Ammonia
	};
}

/** A fresh LSS record for one shift: AM keeps the daily welfare check; PM covers equipment and hygiene. */
export function createLSSPart(part: 'AM' | 'PM', date: string, initials = ''): LSSData {
	const lss = createEmptyForms(date).lss;
	return part === 'AM' ? { ...lss, shiftPart: 'AM', amInitials: initials } : { ...lss, shiftPart: 'PM', pmInitials: initials };
}
