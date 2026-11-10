/**
 * Metadata for the animal welfare escalation guide at /help.
 * When any source document changes, update the guide text, LAST_REVIEWED and NEXT_REVIEW_DUE together.
 */
export const LAST_REVIEWED = '2026-11-10';
/** Matches the review date on the lab's escalation documents (November 2027). */
export const NEXT_REVIEW_DUE = '2027-11-10';

export const ESCALATION_VIDEO = {
	title: 'Epaulette shark animal welfare escalation video',
	presenter: 'Dr Leo Foyle, JCU veterinarian',
	recorded: '10 November 2026',
	duration: '20 min 47 s',
	url: 'https://www.dropbox.com/scl/fi/63mw9v19ypz2tio44ugst/Epaulette-shark-animal-welfare-escalation-video-by-Dr-Leo-Foyle-10Nov.2026.mp4?rlkey=qa66nh3rmjhbxesjci5sv9c27&st=oajqdpr5&dl=0'
};

/** Escalation contacts from the Escalation Pathway (10 Nov 2026). `tel` is E.164 for tap-to-call. */
export const VET_CONTACTS = [
	{ role: 'Usual veterinarian', name: 'Dr Leo Foyle', phone: '0459 936 773', tel: '+61459936773' },
	{ role: 'After-hours alternative', name: 'Prof Jodie Rummer (PI)', phone: '0439 166 171', tel: '+61439166171' }
];

export const SOURCE_FOLDER_URL = 'https://www.dropbox.com/scl/fo/88e415v2p3dzxwdt12u15/AF08-8qWzlw-sByI0Lpf2BI?rlkey=xwwen0j79ocbx5qnsxrwohr20&st=op9p5ilu&e=1&dl=0';

/** Documents this guide summarises, with the version each summary was checked against. */
export const SOURCE_DOCUMENTS = [
	{ title: 'Epaulette Shark Escalation Pathway (written pathway and flowchart)', version: '10 Nov 2026' },
	{ title: 'Euthanising epaulette sharks with AQUI-S (SOP, adapted from SOP-75B001)', version: '10 Nov 2026' },
	{ title: 'Rummer Lab Water Quality Chart, Room 6 and Room 12', version: '10 Nov 2026' },
	{ title: 'Rummer Lab Mortality Procedure', version: 'Aug 2026' },
	{ title: 'Escalation video, Dr Leo Foyle', version: '10 Nov 2026' }
];

/** Seasonal temperature setpoints, the same in Room 6 and Room 12 (acceptable ±1 °C). Months are 1-12. */
export const TEMPERATURE_SETPOINTS = [
	{ months: 'Jan–Mar', from: 1, to: 3, celsius: 26 },
	{ months: 'Apr–May', from: 4, to: 5, celsius: 24 },
	{ months: 'Jun–Aug', from: 6, to: 8, celsius: 22 },
	{ months: 'Sep–Oct', from: 9, to: 10, celsius: 24 },
	{ months: 'Nov–Dec', from: 11, to: 12, celsius: 26 }
];

/** Volume of AQUI-S (mL) for a euthanasia bath at 400 mg/L isoeugenol, from the SOP formula 400 × litres / 540. */
export function aquiSVolumeMl(bathLitres: number): number {
	return Math.round((400 * bathLitres / 540) * 10) / 10;
}

export type ReviewStatus = { overdue: boolean; daysUntilDue: number };

/** Whether the guide is past its review date. `today` is an ISO date (YYYY-MM-DD). */
export function reviewStatus(today: string, due = NEXT_REVIEW_DUE): ReviewStatus {
	const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
	return { overdue: days < 0, daysUntilDue: days };
}

/** "10 November 2026" from an ISO date, without timezone drift. */
export function longDate(iso: string): string {
	return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

export type RoomId = 'room12' | 'room6';

/** Acceptable ranges are the same in both rooms; the actions and pH dosing are not. */
export const WATER_QUALITY_LIMITS = [
	{ key: 'salinity', parameter: 'Salinity', acceptable: '35 ppt (33–37)' },
	{ key: 'temp', parameter: 'Temperature', acceptable: 'Seasonal setpoint ±1 °C' },
	{ key: 'pH', parameter: 'pH', acceptable: '8.0–8.3' },
	{ key: 'ammonia', parameter: 'Ammonia', acceptable: '< 0.02 mg/L' },
	{ key: 'nitrite', parameter: 'Nitrite', acceptable: '< 0.1 mg/L' },
	{ key: 'nitrate', parameter: 'Nitrate', acceptable: '< 40 mg/L' }
] as const;

type LimitKey = typeof WATER_QUALITY_LIMITS[number]['key'];

export interface RoomWaterQuality {
	id: RoomId;
	name: string;
	description: string;
	retestHours: number;
	actions: Record<LimitKey, string>;
	ph: { gramsPerTenth: number; at7_6: number; at7_8: number };
}

const temperature = 'Advise the lab manager, who will have MARFU adjust. Retest after the adjustment period MARFU gives; repeat if still out.';
const phRetest = (h: number) => `Calibrate the pH pen and retest, then retest in the Biochem Lab. If the Biochem test is out of range, follow the pH adjustment chart below. Retest after more than ${h} h; repeat if still out.`;

/** Room 12 and Room 6 action steps from the Rummer Lab Water Quality Chart (10 Nov 2026). */
export const WATER_QUALITY_ROOMS: RoomWaterQuality[] = [
	{
		id: 'room12',
		name: 'Room 12',
		description: 'Breeding colony',
		retestHours: 3,
		actions: {
			salinity: 'Calibrate the refractometer and retest. If still out, advise the lab manager, who will have MARFU adjust salinity. Retest after more than 3 h; repeat if still out.',
			temp: temperature,
			pH: phRetest(3),
			ammonia: 'Repeat the analysis, clean tanks thoroughly, retest after more than 3 h, then advise the lab manager, who will coordinate a water change with MARFU.',
			nitrite: 'Repeat the analysis, clean tanks thoroughly, retest after more than 3 h, then advise the lab manager, who will coordinate a water change with MARFU.',
			nitrate: 'Repeat the analysis, do a 50% dilution test, clean tanks thoroughly, retest after more than 3 h, then advise the lab manager, who will coordinate a water change with MARFU.'
		},
		ph: { gramsPerTenth: 150, at7_6: 900, at7_8: 600 }
	},
	{
		id: 'room6',
		name: 'Room 6',
		description: 'Egg room',
		retestHours: 2,
		actions: {
			salinity: 'Calibrate the refractometer and retest. If still out, do a 50% water change, replacing with a mix of dechlorinated and salt water to the desired salinity. Retest after more than 2 h; repeat if still out.',
			temp: temperature,
			pH: phRetest(2),
			ammonia: 'Repeat the analysis, clean tanks thoroughly, retest after more than 2 h, then do a 75% water change.',
			nitrite: 'Repeat the analysis, clean tanks thoroughly, retest after more than 2 h, then do a 75% water change.',
			nitrate: 'Repeat the analysis, do a 50% dilution test, clean tanks thoroughly, retest after more than 2 h, then do a 75% water change.'
		},
		ph: { gramsPerTenth: 20, at7_6: 120, at7_8: 80 }
	}
];
