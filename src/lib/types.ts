export type YesNoNA = '' | 'X' | 'Y' | 'N' | 'N/A' | '/';
export type PalpationOption = '' | '0' | 'L' | 'R' | 'B' | 'N/A';

export interface LSSData {
	date: string;
	amInitials: string;
	pmInitials: string;
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
	// Routine Mon/Wed/Fri
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

export interface FullHusbandrySubmission {
	id: string;
	submittedAt: string;
	date: string;
	initials: string;
	modulesSubmitted: ('lss' | 'tanksEggs' | 'feeds' | 'waterQuality')[];
	lss?: LSSData;
	tanksEggs?: TanksEggsData;
	feeds?: FeedsData;
	waterQuality?: WaterQualityData;
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
	summary: string;
	payload: FullHusbandrySubmission;
}
