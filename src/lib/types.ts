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

/** Room 6 Egg Checks (#99): mirrors the workbook's "Egg Checks" sheet. Counts are whole numbers; IDs are free text. */
export interface Room6EggChecksData {
	date: string;
	initials: string;
	candling: '' | 'Y' | 'N';
	windCount: string;
	windIds: string;
	newCount: string;
	newIds: string;
	embryoCount: string;
	embryoIds: string;
	deadCount: string;
	deadIds: string;
	notes: string;
}

/** Room 6 Water Quality (#99): one system (no Side A/B). Values are numbers or NOT_MEASURED. */
export interface Room6WaterQualityData {
	date: string;
	initials: string;
	temp: string;
	pH: string;
	salinity: string;
	dissolvedOxygen: string;
	alk: string;
	weeklypH: string;
	nh3: string;
	no2: string;
	no3: string;
	po4: string;
	notes: string;
}

/**
 * Room 6 LSS and Maintenance (#99). Per-tank task keys come from ROOM6_TANK_TASK_KEYS
 * (e.g. tank1_siphon) and hold 'Y' (done) or '' (not done).
 */
export interface Room6LssData {
	date: string;
	initials: string;
	sumpWaterChange: '' | 'None' | '25%' | '50%' | '75%' | '100%';
	sumpTopUp: '' | 'None' | 'Fresh' | 'Salt';
	sumpVac: '' | 'Y';
	biofilterClean: '' | 'Y';
	biofilterFlowAir: '' | 'Y' | 'N';
	biofilterFlowWater: '' | 'Y' | 'N';
	tankFlowAir: '' | 'Y' | 'N';
	tankFlowWater: '' | 'Y' | 'N';
	gutterVac: '' | 'Y';
	gutterScrub: '' | 'Y';
	notes: string;
	[tankTask: `tank${string}_${string}`]: string;
}

/** Room 6 Ammonia + Nitrite spot check (#99), recorded several times a day. */
export interface Room6AmmoniaData {
	date: string;
	time: string;
	initials: string;
	ammonia: string;
	nitrite: string;
	notes: string;
}

export interface FullHusbandrySubmission {
	id: string;
	submittedAt: string;
	date: string;
	initials: string;
	modulesSubmitted: ('lss' | 'tanksEggs' | 'feeds' | 'waterQuality' | 'room6' | 'room6Eggs' | 'room6WaterQuality' | 'room6Lss' | 'room6Ammonia')[];
	lss?: LSSData;
	tanksEggs?: TanksEggsData;
	feeds?: FeedsData;
	waterQuality?: WaterQualityData;
	/** Legacy single-row Room 6 record (#79); new entries use the workbook-matching modules below. */
	room6?: Room6Data;
	room6Eggs?: Room6EggChecksData;
	room6WaterQuality?: Room6WaterQualityData;
	room6Lss?: Room6LssData;
	room6Ammonia?: Room6AmmoniaData;
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
