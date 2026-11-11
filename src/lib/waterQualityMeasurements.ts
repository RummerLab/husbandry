import type { WaterQualityData } from './types';
import { NOT_MEASURED, notMeasurableFields } from './validation';

/** Short label for narrow read-only inputs; stored value stays NOT_MEASURED and still exports blank. */
export const NOT_MEASURED_DISPLAY = 'N/M';

/** Display-only value for measurement inputs (does not change the stored answer). */
export function measurementInputValue(value: string | undefined): string {
	return value === NOT_MEASURED ? NOT_MEASURED_DISPLAY : value ?? '';
}

/** Change one explicit answer without discarding the other side's measurement. */
export function toggleNotMeasured(data: WaterQualityData, field: keyof WaterQualityData): WaterQualityData {
	if (!notMeasurableFields.includes(field)) throw new Error('This field requires a measurement.');
	return { ...data, [field]: data[field] === NOT_MEASURED ? '' : NOT_MEASURED };
}
