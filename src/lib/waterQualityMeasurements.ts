import type { WaterQualityData } from './types';
import { NOT_MEASURED, notMeasurableFields } from './validation';

/** Change one explicit answer without discarding the other side's measurement. */
export function toggleNotMeasured(data: WaterQualityData, field: keyof WaterQualityData): WaterQualityData {
	if (!notMeasurableFields.includes(field)) throw new Error('This field requires a measurement.');
	return { ...data, [field]: data[field] === NOT_MEASURED ? '' : NOT_MEASURED };
}
