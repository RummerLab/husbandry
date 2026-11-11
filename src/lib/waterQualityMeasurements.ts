import type { WaterQualityData } from './types';
import { NOT_MEASURED, notMeasurableFields } from './validation';

/** Short label for narrow read-only inputs; stored value stays NOT_MEASURED and still exports blank. */
export const NOT_MEASURED_DISPLAY = 'N/M';

export type MeasurementAnswer = { kind: 'unanswered' } | { kind: 'notMeasured' } | { kind: 'entered'; value: string };
/** Parsing does not decide validity; getModuleIssues remains authoritative. */
export function measurementAnswer(value: string | undefined): MeasurementAnswer {
	if (value === NOT_MEASURED) return { kind: 'notMeasured' };
	return !value ? { kind: 'unanswered' } : { kind: 'entered', value };
}
export function toggleExplicitNotMeasured(value: string): string {
	return value === NOT_MEASURED ? '' : NOT_MEASURED;
}

/** Display-only value for measurement inputs (does not change the stored answer). */
export function measurementInputValue(value: string | undefined): string {
	const answer = measurementAnswer(value);
	return answer.kind === 'notMeasured' ? NOT_MEASURED_DISPLAY : answer.kind === 'entered' ? answer.value : '';
}

/** Change one explicit answer without discarding the other side's measurement. */
export function toggleNotMeasured(data: WaterQualityData, field: keyof WaterQualityData): WaterQualityData {
	if (!notMeasurableFields.includes(field)) throw new Error('This field requires a measurement.');
	return { ...data, [field]: toggleExplicitNotMeasured(data[field] as string) };
}
