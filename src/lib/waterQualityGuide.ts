import { notMeasurableFields, type ModuleIssue } from './validation';

const PARAMETERS: Record<string, string> = {
	temp: 'Temperature (°C)',
	salinity: 'Salinity (ppt)',
	pH: 'pH',
	do: 'Dissolved oxygen (%)',
	alk: 'Alkalinity',
	weeklypH: 'Weekly pH',
	nh3: 'Ammonia NH3',
	no2: 'Nitrite NO2',
	no3: 'Nitrate NO3',
	po4: 'Phosphate PO4'
};

/** Plain-language correction for a shared validation issue; rules stay in getModuleIssues. */
export function describeWaterQualityIssue(issue: ModuleIssue): string {
	if (issue.field === 'initials') return 'Analyst initials are required.';
	if (issue.field === 'date') return 'Choose a valid date of records.';
	const match = /^(.+)([AB])$/.exec(issue.field);
	if (!match || !(match[1] in PARAMETERS)) return issue.message;
	const label = `${PARAMETERS[match[1]]}, Side ${match[2]}`;
	if (match[1] === 'do') return `${label}: enter a number without % (e.g. 98), or N/A if not measured.`;
	const orSkip = notMeasurableFields.includes(issue.field) ? ', or tap Not measured if this test was not done' : '';
	if (match[1].endsWith('pH')) return `${label}: enter a number from 0 to 14 (e.g. 8.2)${orSkip}.`;
	return `${label}: enter a number without units (e.g. 26.3; 0 is allowed)${orSkip}.`;
}

const FORM_ORDER = ['date', 'initials', 'tempA', 'tempB', 'salinityA', 'salinityB', 'pHA', 'pHB', 'doA', 'doB', 'alkA', 'alkB', 'weeklypHA', 'weeklypHB', 'nh3A', 'nh3B', 'no2A', 'no2B', 'no3A', 'no3B', 'po4A', 'po4B'];

/** List issues in the order fields appear on screen. */
export function sortWaterQualityIssues(issues: ModuleIssue[]): ModuleIssue[] {
	const rank = (field: string) => { const index = FORM_ORDER.indexOf(field); return index === -1 ? FORM_ORDER.length : index; };
	return [...issues].sort((a, b) => rank(a.field) - rank(b.field));
}

/** Fields that already hold text but fail validation, so typos are flagged before Save is tried. */
export function enteredInvalidIssues(issues: ModuleIssue[], data: object): ModuleIssue[] {
	const values = data as Record<string, unknown>;
	return issues.filter(issue => typeof values[issue.field] === 'string' && (values[issue.field] as string).trim() !== '');
}
