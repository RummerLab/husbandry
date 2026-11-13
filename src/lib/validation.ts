import { createEmptyForms } from './formDefaults';
import { ROOM12_TANKS } from './tanksConfig';
import { ROOM6_LSS_FLOWS, ROOM6_LSS_TICKS, ROOM6_TANK_TASK_KEYS, ROOM6_TOP_UP, ROOM6_WATER_CHANGE } from './room6Config';

export const modules = ['lss', 'tanksEggs', 'feeds', 'waterQuality', 'room6', 'room6Eggs', 'room6WaterQuality', 'room6Lss', 'room6Ammonia'] as const;
export type Module = typeof modules[number];
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const date = (v: unknown): boolean => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const numeric = (v: unknown): boolean => text(v) && /^\d+(\.\d+)?$/.test(v.trim()) && Number.isFinite(Number(v));
const choices = ['Y', 'N', 'N/A', '/'];
export const lssChecks = ['skimmerVenturi', 'skimmerSprayDown', 'filterCleaned', 'filterReplaced', 'waterLevelsAM', 'waterLevelsPM', 'waterFlowAM', 'waterFlowPM', 'airstonesAM', 'airstonesPM', 'vacNetTanks', 'tanksScrubbed', 'overflowCleaned', 'hoseFloorLadder', 'footTubLidsSqueegee', 'equipmentDisinfected'];
/** Checks recorded by the AM shift; everything else in lssChecks belongs to the PM shift (last person in the room). */
export const lssAmChecks = ['waterLevelsAM', 'waterFlowAM', 'airstonesAM'];
export const lssPmChecks = lssChecks.filter(key => !lssAmChecks.includes(key));
export const lssShiftParts = ['AM', 'PM'] as const;
/** Explicit answer for water tests not done in this session (e.g. pH by MARFU, PO4 only with a SpinTouch); exported as a blank cell. */
export const NOT_MEASURED = 'Not measured';
/** Water Quality fields that accept NOT_MEASURED. Temperature and salinity always need a reading. */
export const notMeasurableFields = ['pHA', 'pHB', 'alkA', 'alkB', 'weeklypHA', 'weeklypHB', 'nh3A', 'nh3B', 'no2A', 'no2B', 'no3A', 'no3B', 'po4A', 'po4B'];
export const room6NotMeasurableFields = ['pH', 'dissolvedOxygen', 'alk', 'weeklypH', 'nh3', 'no2', 'no3', 'po4'] as const;
export const weeklyFields = ['alkA', 'alkB', 'weeklypHA', 'weeklypHB', 'nh3A', 'nh3B', 'no2A', 'no2B', 'no3A', 'no3B', 'po4A', 'po4B'];

export interface ModuleIssue { field: string; message: string }

export function getModuleIssues(module: Module, value: unknown): ModuleIssue[] {
	if (!object(value)) return [{ field: '', message: `${module}: dataset required` }];
	const errors: ModuleIssue[] = [];
	const reject = (field: string, message: string) => errors.push({ field, message });
	// Validate known text fields while preserving bounded future extension fields unchanged.
	const fields = new Set([...Object.keys(createEmptyForms('')[module]), ...(module === 'waterQuality' ? weeklyFields : [])]);
	fields.delete('tanks'); fields.delete('isWeeklyCheck'); fields.delete('routineIncluded');
	for (const key of fields) {
		const field = value[key];
		if (field === undefined) continue;
		if (typeof field !== 'string') reject(key, `${module}: ${key} must be text`);
		else if (field.length > (/initials/i.test(key) ? 32 : 5000)) reject(key, `${module}: ${key} exceeds its character limit`);
	}
	const require = (key: string, check = text) => { if (!check(value[key])) reject(key, `${module}: ${key} required or invalid`); };
	const enumField = (key: string, allowed = choices) => require(key, (v: unknown): v is string => typeof v === 'string' && allowed.includes(v));
	if (!date(value.date)) reject('date', `${module}: valid date required`);
	if (module !== 'lss') require('initials');
	if (module === 'lss') {
		const part = value.shiftPart;
		const blank = (key: string) => { const v = value[key]; if (v !== undefined && v !== '') reject(key, `lss: ${key} belongs to the other shift and must be left blank`); };
		if (part === undefined) {
			// Pre-split records carry both shifts in one row.
			require('amInitials');
			lssChecks.forEach(key => enumField(key));
			// New forms always carry animalsChecked; only pre-upgrade queued records omit it.
			if (value.animalsChecked !== undefined) enumField('animalsChecked', ['Y', 'N']);
			if (value.animalsChecked === 'N') require('concerns');
		} else if (part === 'AM') {
			// The daily animal welfare check stays with the AM shift.
			require('amInitials');
			enumField('animalsChecked', ['Y', 'N']);
			if (value.animalsChecked === 'N') require('concerns');
			lssAmChecks.forEach(key => enumField(key));
			['pmInitials', ...lssPmChecks].forEach(blank);
		} else if (part === 'PM') {
			require('pmInitials');
			lssPmChecks.forEach(key => enumField(key));
			['amInitials', 'animalsChecked', ...lssAmChecks].forEach(blank);
		} else reject('shiftPart', 'lss: shift must be AM or PM');
	}
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
		// Routine readings and weekly chemistry are often taken at different times, so either section can be
		// saved on its own (#133). An absent flag means a pre-upgrade record that carries both.
		const routineIncluded = value.routineIncluded !== false;
		if (value.routineIncluded !== undefined && typeof value.routineIncluded !== 'boolean') reject('routineIncluded', 'waterQuality: routine inclusion flag must be true or false');
		if (!routineIncluded && value.isWeeklyCheck !== true) reject('routineIncluded', 'waterQuality: include routine checks or weekly chemistry');
		const routineFields = ['tempA', 'tempB', 'pHA', 'pHB', 'salinityA', 'salinityB'];
		const measurement = (key: string) => {
			if (value[key] === NOT_MEASURED && notMeasurableFields.includes(key)) return;
			if (!numeric(value[key]) || (key.toLowerCase().includes('ph') && Number(value[key]) > 14)) reject(key, `waterQuality: ${key} invalid measurement`);
		};
		if (routineIncluded) {
			for (const key of [...routineFields, ...(value.isWeeklyCheck === true ? weeklyFields : [])]) measurement(key);
			for (const key of ['doA', 'doB']) if (!numeric(value[key]) && value[key] !== '/' && value[key] !== 'N/A') reject(key, `waterQuality: ${key} measurement or explicit N/A required`);
		} else {
			// Chemistry-only rows leave the routine columns blank in the sheet. Their hidden draft answers are
			// retained (so re-including routine checks restores them) but are never exported.
			if (value.isWeeklyCheck === true) for (const key of weeklyFields) measurement(key);
		}
	}
	if (module === 'room6') {
		enumField('eggsChecked', ['Y', 'N']);
		if (value.eggsChecked === 'N') require('concerns');
		if (!text(value.deadEggsRemoved) || !/^\d+$/.test(value.deadEggsRemoved.trim()) || !Number.isSafeInteger(Number(value.deadEggsRemoved))) reject('deadEggsRemoved', 'room6: deadEggsRemoved must be a whole number (0 if none)');
		for (const key of ['temp', 'salinity']) if (!numeric(value[key])) reject(key, `room6: ${key} invalid measurement`);
		if (value.pH !== NOT_MEASURED && (!numeric(value.pH) || Number(value.pH) > 14)) reject('pH', 'room6: pH invalid measurement');
		enumField('waterChange', ['None', '50%', '75%', 'Other']);
		if (value.waterChange === 'Other') require('notes');
	}
	// A whole-number count (0 if none) that converts to a safe integer for the numeric sheet cell.
	const count = (key: string) => {
		const v = value[key];
		if (!text(v) || !/^\d+$/.test(v.trim()) || !Number.isSafeInteger(Number(v))) reject(key, `${module}: ${key} must be a whole number (0 if none)`);
	};
	const measuredOrSkipped = (key: string) => {
		if (value[key] === NOT_MEASURED) return;
		if (!numeric(value[key]) || (key.toLowerCase().includes('ph') && Number(value[key]) > 14)) reject(key, `${module}: ${key} invalid measurement`);
	};
	if (module === 'room6Eggs') {
		enumField('candling', ['Y', 'N']);
		for (const [countKey, idsKey] of [['windCount', 'windIds'], ['newCount', 'newIds'], ['embryoCount', 'embryoIds'], ['deadCount', 'deadIds']]) {
			count(countKey);
			// Any eggs counted must be identified (tag IDs, or the tank for wind eggs).
			if (text(value[countKey]) && Number(value[countKey]) > 0) require(idsKey);
		}
	}
	if (module === 'room6WaterQuality') {
		for (const key of ['temp', 'salinity']) if (!numeric(value[key])) reject(key, `${module}: ${key} invalid measurement`);
		for (const key of room6NotMeasurableFields) measuredOrSkipped(key);
	}
	if (module === 'room6Lss') {
		for (const key of [...ROOM6_TANK_TASK_KEYS, ...ROOM6_LSS_TICKS]) {
			if (value[key] !== undefined && value[key] !== '' && value[key] !== 'Y') reject(key, `${module}: ${key} must be ticked or left blank`);
		}
		enumField('sumpWaterChange', Object.keys(ROOM6_WATER_CHANGE));
		enumField('sumpTopUp', [...ROOM6_TOP_UP]);
		for (const key of ROOM6_LSS_FLOWS) enumField(key, ['Y', 'N']);
		// A flow problem is a welfare concern: say what was found and done.
		if (ROOM6_LSS_FLOWS.some(key => value[key] === 'N')) require('notes');
	}
	if (module === 'room6Ammonia') {
		require('time', (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v));
		for (const key of ['ammonia', 'nitrite']) if (!numeric(value[key])) reject(key, `${module}: ${key} invalid measurement`);
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

/** Preserve the existing validation API for server and submission guards. */
export function validateModule(module: Module, value: unknown): string[] {
	return getModuleIssues(module, value).map(issue => issue.message);
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
