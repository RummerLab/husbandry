export type YesNoNA = '' | 'X' | 'Y' | 'N' | 'N/A' | '/';
export type PalpationOption = '' | '0' | 'L' | 'R' | 'B' | 'N/A';

export interface LSSData {
	date: string;
	amInitials: string;
	pmInitials: string;
	/** Which shift's half of the LSS sheet this record covers. Absent on pre-split records, which cover both. */
	shiftPart?: 'AM' | 'PM';
	/** Daily animal welfare check. Pre-upgrade queued records may lack it at runtime; validation tolerates that. */
	animalsChecked: '' | 'Y' | 'N';
	// Protein skimmer
	skimmerVenturi: YesNoNA;
	skimmerSprayDown: YesNoNA;
	// Filter canister
	filterCleaned: YesNoNA;
	filterReplaced: YesNoNA;
	// Tanks 1-8 Daily Checks
	waterLevelsAM: YesNoNA;
	waterLevelsPM: YesNoNA;
	waterFlowAM: YesNoNA;
	waterFlowPM: YesNoNA;
	airstonesAM: YesNoNA;
	airstonesPM: YesNoNA;
	// Daily Maintenance & Hygiene
	vacNetTanks: YesNoNA;
	tanksScrubbed: YesNoNA;
	overflowCleaned: YesNoNA;
	hoseFloorLadder: YesNoNA;
	footTubLidsSqueegee: YesNoNA;
	equipmentDisinfected: YesNoNA;
	// Notes
	concerns: string;
	notes: string;
}

export interface TanksEggsData {
	date: string;
	initials: string;
	// Palpations (0 = None, L = Left, R = Right, B = Both)
	palpationHO103: PalpationOption;
	palpationHO102: PalpationOption;
	palpationHO116: PalpationOption;
	palpationHO105: PalpationOption;
	palpationHO117: PalpationOption;
	// Egg Checks
	windEggs: string;
	newEggs: string;
	newEggTag: string;
	newEmbryos: YesNoNA;
	candling: YesNoNA;
	deadEggTag: string;
	// Checks & Updates
	foodRecordsEnteredPM: YesNoNA;
	whatsappUpdateAM: YesNoNA;
	whatsappUpdatePM: YesNoNA;
	observationsNotes: string;
	// Moves / Mortalities
	moveDescription: string;
	moveFrom: string;
	moveTo: string;
	moveQty: string;
}

export interface TankFeedEntry {
	tankId: string;
	label: string;
	targetAmt: string;
	animals: Array<{
		tag: string;
		name: string;
		medicationType?: 'Elasmotab' | 'Formula';
		medicationGiven?: YesNoNA;
	}>;
	amountFed: string;
	uneatenGrams: string;
	notes?: string;
}

export interface FeedsData {
	date: string;
	initials: string;
	tanks: Record<string, {
		amountFed: string;
		meds: Record<string, YesNoNA>;
		uneatenGrams: string;
	}>;
	notes: string;
}

export interface WaterQualityData {
	date: string;
	initials: string;
	isWeeklyCheck: boolean;
	// Routine checks (at least every second day, including weekends)
	tempA: string;
	tempB: string;
	pHA: string;
	pHB: string;
	salinityA: string;
	salinityB: string;
	doA: string;
	doB: string;
	// Weekly
	alkA?: string;
	alkB?: string;
	weeklypHA?: string;
	weeklypHB?: string;
	nh3A?: string;
	nh3B?: string;
	no2A?: string;
	no2B?: string;
	no3A?: string;
	no3B?: string;
	po4A?: string;
	po4B?: string;
	notes: string;
}

/** Room 6 (egg room) daily check (#79). Initial field list authorised by the repository owner on 2026-11-11. */
export interface Room6Data {
	date: string;
	initials: string;
	/** All eggs sighted with normal appearance (Y/N); N makes concerns required. */
	eggsChecked: '' | 'Y' | 'N';
	/** Dead or unviable eggs removed today (0 is a valid answer). */
	deadEggsRemoved: string;
	temp: string;
	salinity: string;
	/** A number, or NOT_MEASURED. */
	pH: string;
	waterChange: '' | 'None' | '50%' | '75%' | 'Other';
	concerns: string;
	notes: string;
}

export interface FullHusbandrySubmission {
	id: string;
	submittedAt: string;
	date: string;
	initials: string;
	modulesSubmitted: ('lss' | 'tanksEggs' | 'feeds' | 'waterQuality' | 'room6')[];
	lss?: LSSData;
	tanksEggs?: TanksEggsData;
	feeds?: FeedsData;
	waterQuality?: WaterQualityData;
	room6?: Room6Data;
	clientDeviceId?: string;
}

export interface LocalHistoryItem {
	id: string;
	submittedAt: string;
	date: string;
	initials: string;
	modules: string[];
	synced: boolean;
	syncError?: string;
	/** Permanent server rejection; retained for administrator-assisted correction. */
	syncBlocked?: boolean;
	summary: string;
	payload: FullHusbandrySubmission;
}
