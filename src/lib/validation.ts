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

export function validateModule(module: Module, value: unknown): string[] {
	if (!object(value)) return [`${module}: dataset required`];
	const errors: string[] = [];
	for (const [key, field] of Object.entries(value)) {
		if (['tanks', 'isWeeklyCheck'].includes(key)) continue;
		if (typeof field !== 'string') errors.push(`${module}: ${key} must be text`);
		if (/initials/i.test(key) && typeof field === 'string' && field.length > 32) errors.push(`${module}: ${key} maximum 32 characters`);
	}
	const require = (key: string, check = text) => { if (!check(value[key])) errors.push(`${module}: ${key} required or invalid`); };
	const enumField = (key: string, allowed = choices) => require(key, (v: unknown): v is string => typeof v === 'string' && allowed.includes(v));
	if (!date(value.date)) errors.push(`${module}: valid date required`);
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
			if (!object(entry)) { errors.push(`feeds: ${tank.name} missing`); continue; }
			for (const key of ['amountFed', 'uneatenGrams']) if (!numeric(entry[key])) errors.push(`feeds: ${tank.name} ${key} must be a nonnegative number`);
			const meds = object(entry.meds) ? entry.meds : {};
			for (const shark of tank.sharks) if (tank.medicationType !== 'None' && shark.medId && !choices.includes(String(meds[shark.medId]))) errors.push(`feeds: ${tank.name} ${shark.label} medication required`);
		}
	}
	if (module === 'waterQuality') {
		if (typeof value.isWeeklyCheck !== 'boolean') errors.push('waterQuality: weekly check flag required');
		const fields = ['tempA', 'tempB', 'pHA', 'pHB', 'salinityA', 'salinityB', ...(value.isWeeklyCheck === true ? weeklyFields : [])];
		for (const key of fields) if (!numeric(value[key]) || (key.toLowerCase().includes('ph') && Number(value[key]) > 14)) errors.push(`waterQuality: ${key} invalid measurement`);
		for (const key of ['doA', 'doB']) if (!numeric(value[key]) && value[key] !== '/' && value[key] !== 'N/A') errors.push(`waterQuality: ${key} measurement or explicit N/A required`);
	}
	return errors;
}

/** Keep legacy extension fields intact for receipt hashes, but bound their shape. */
export function validatePayloadBounds(value: unknown, path = 'Submission', depth = 0): string[] {
	if (depth > 8) return [`${path}: nesting exceeds 8 levels`];
	if (typeof value === 'string') return value.length > 5000 ? [`${path}: maximum 5000 characters`] : [];
	if (typeof value === 'number') return Number.isFinite(value) ? [] : [`${path}: invalid number`];
	if (Array.isArray(value)) {
		if (value.length > 32) return [`${path}: too many entries`];
		return value.flatMap((v, i) => validatePayloadBounds(v, `${path}[${i}]`, depth + 1));
	}
	if (object(value)) {
		if (Object.keys(value).length > 200) return [`${path}: too many fields`];
		return Object.entries(value).flatMap(([key, v]) => key.length > 100 ? [`${path}: field name too long`] : validatePayloadBounds(v, `${path}.${key}`, depth + 1));
	}
	return [];
}

export function validateSubmission(value: unknown): string[] {
	if (!object(value)) return ['Submission must be an object'];
	const errors: string[] = validatePayloadBounds(value);
	if (value.initials !== undefined && (typeof value.initials !== 'string' || value.initials.length > 32)) errors.push('Initials: maximum 32 characters');
	if (value.clientDeviceId !== undefined && (typeof value.clientDeviceId !== 'string' || !/^device_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.clientDeviceId))) errors.push('Invalid client device ID');
	for (const module of modules) if (value[module] !== undefined && !object(value[module])) errors.push(`${module}: dataset must be an object`);
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
