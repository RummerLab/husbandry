/**
 * Lab Overview flag ranges (#66). PROVISIONAL defaults for a tropical marine shark system:
 * the lab must confirm or edit these. A reading outside [min, max] is highlighted, never blocked.
 */
export interface Range { min?: number; max?: number; label: string; unit: string }

export const WATER_QUALITY_RANGES: Record<string, Range> = {
	temp: { min: 25, max: 29, label: 'Temperature', unit: '°C' },
	salinity: { min: 32, max: 37, label: 'Salinity', unit: 'ppt' },
	pH: { min: 7.9, max: 8.4, label: 'pH', unit: '' },
	do: { min: 80, label: 'Dissolved oxygen', unit: '%' },
	nh3: { max: 0, label: 'Ammonia NH3', unit: 'ppm' },
	no2: { max: 0, label: 'Nitrite NO2', unit: 'ppm' },
	no3: { max: 50, label: 'Nitrate NO3', unit: 'ppm' },
	po4: { max: 2, label: 'Phosphate PO4', unit: 'ppm' }
};

/** Days shown in trend tables and recent-activity lists. */
export const OVERVIEW_DAYS = 14;
/** A tank is flagged when it ate (fed - uneaten) at most this many grams on at least FEEDING_FLAG_DAYS of the last 7 days. */
export const LOW_INTAKE_GRAMS = 0;
export const FEEDING_FLAG_DAYS = 2;

export const FEMALES = ['HO103', 'HO102', 'HO116', 'HO105', 'HO117'] as const;

export function outOfRange(value: number | null, range: Range | undefined): boolean {
	if (value === null || !range) return false;
	return (range.min !== undefined && value < range.min) || (range.max !== undefined && value > range.max);
}
