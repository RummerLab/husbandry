import { ROOM12_TANKS } from './tanksConfig';

export const modules = ['lss', 'tanksEggs', 'feeds', 'waterQuality'] as const;
export type Module = typeof modules[number];
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const date = (v: unknown): boolean => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const numeric = (v: unknown): boolean => text(v) && /^\d+(\.\d+)?$/.test(v.trim()) && Number.isFinite(Number(v));
const choices = ['Y', 'N', 'N/A', '/'];
export const lssChecks = ['skimmerVenturi', 'skimmerSprayDown', 'filterCleaned', 'filterReplaced', 'waterLevelsAM', 'waterLevelsPM', 'waterFlowAM', 'waterFlowPM', 'airstonesAM', 'airstonesPM', 'vacNetTanks', 'tanksScrubbed', 'overflowCleaned', 'hoseFloorLadder', 'footTubLidsSqueegee', 'equipmentDisinfected'];
export const weeklyFields = ['alkA', 'alkB', 'weeklypHA', 'weeklypHB', 'nh3A', 'nh3B', 'no2A', 'no2B', 'no3A', 'no3B', 'po4A', 'po4B'];

export interface ModuleIssue { field: string; message: string }

export function getModuleIssues(module: Module, value: unknown): ModuleIssue[] {
	if (!object(value)) return [{ field: '', message: `${module}: dataset required` }];
	const errors: ModuleIssue[] = [];
	const reject = (field: string, message: string) => errors.push({ field, message });
	const require = (key: string, check = text) => { if (!check(value[key])) reject(key, `${module}: ${key} required or invalid`); };
	const enumField = (key: string, allowed = choices) => require(key, (v: unknown): v is string => typeof v === 'string' && allowed.includes(v));
	if (!date(value.date)) reject('date', `${module}: valid date required`);
	require(module === 'lss' ? 'amInitials' : 'initials');
	if (module === 'lss') lssChecks.forEach(key => enumField(key));
	if (module === 'tanksEggs') {
		['103', '102', '116', '105', '117'].forEach(id => enumField(`palpationHO${id}`, ['0', 'L', 'R', 'B', 'N/A']));
		['windEggs', 'newEggs', 'newEggTag', 'deadEggTag'].forEach(key => require(key));
		['newEmbryos', 'candling'].forEach(key => enumField(key, ['Y', 'N', 'X']));
		['foodRecordsEnteredPM', 'whatsappUpdateAM', 'whatsappUpdatePM'].forEach(key => enumField(key));
	}
	if (module === 'feeds') {
		const tanks = object(value.tanks) ? value.tanks : {};
		for (const tank of ROOM12_TANKS) {
			const entry = tanks[tank.id];
			if (!object(entry)) { reject(`tanks.${tank.id}.amountFed`, `feeds: ${tank.name} missing`); continue; }
			for (const key of ['amountFed', 'uneatenGrams']) if (!numeric(entry[key])) reject(`tanks.${tank.id}.${key}`, `feeds: ${tank.name} ${key} must be a nonnegative number`);
			const meds = object(entry.meds) ? entry.meds : {};
			for (const shark of tank.sharks) if (tank.medicationType !== 'None' && shark.medId && !choices.includes(String(meds[shark.medId]))) reject(`tanks.${tank.id}.meds.${shark.medId}`, `feeds: ${tank.name} ${shark.label} medication required`);
		}
	}
	if (module === 'waterQuality') {
		if (typeof value.isWeeklyCheck !== 'boolean') reject('isWeeklyCheck', 'waterQuality: weekly check flag required');
		const fields = ['tempA', 'tempB', 'pHA', 'pHB', 'salinityA', 'salinityB', ...(value.isWeeklyCheck === true ? weeklyFields : [])];
		for (const key of fields) if (!numeric(value[key]) || (key.toLowerCase().includes('ph') && Number(value[key]) > 14)) reject(key, `waterQuality: ${key} invalid measurement`);
		for (const key of ['doA', 'doB']) if (!numeric(value[key]) && value[key] !== '/' && value[key] !== 'N/A') reject(key, `waterQuality: ${key} measurement or explicit N/A required`);
	}
	return errors;
}

/** Preserve the existing validation API for server and submission guards. */
export function validateModule(module: Module, value: unknown): string[] {
	return getModuleIssues(module, value).map(issue => issue.message);
}

export function validateSubmission(value: unknown): string[] {
	if (!object(value)) return ['Submission must be an object'];
	const errors: string[] = [];
	if (!text(value.id) || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.id)) errors.push('Valid submission ID required');
	if (!date(value.date)) errors.push('Valid date required');
	if (!text(value.submittedAt) || !Number.isFinite(Date.parse(value.submittedAt))) errors.push('Submission timestamp required');
	if (!Array.isArray(value.modulesSubmitted) || !value.modulesSubmitted.length) return [...errors, 'Modules required'];
	if (new Set(value.modulesSubmitted).size !== value.modulesSubmitted.length) errors.push('Duplicate modules');
	for (const module of value.modulesSubmitted) {
		if (!modules.includes(module)) { errors.push('Unknown module'); continue; }
		errors.push(...validateModule(module, value[module]));
		if (object(value[module]) && value[module].date !== value.date) errors.push(`${module}: date differs from submission`);
	}
	return errors;
}
