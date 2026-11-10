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

export const SOURCE_FOLDER_URL = 'https://www.dropbox.com/scl/fo/88e415v2p3dzxwdt12u15/AF08-8qWzlw-sByI0Lpf2BI?rlkey=xwwen0j79ocbx5qnsxrwohr20&st=op9p5ilu&e=1&dl=0';

/** Documents this guide summarises, with the version each summary was checked against. */
export const SOURCE_DOCUMENTS = [
	{ title: 'Epaulette Shark Escalation Pathway (written pathway and flowchart)', version: '10 Nov 2026' },
	{ title: 'Euthanising epaulette sharks with AQUI-S (SOP, adapted from SOP-75B001)', version: '10 Nov 2026' },
	{ title: 'Rummer Lab Water Quality Chart, Room 12', version: '10 Nov 2026' },
	{ title: 'Rummer Lab Mortality Procedure', version: 'Aug 2026' },
	{ title: 'Escalation video, Dr Leo Foyle', version: '10 Nov 2026' }
];

/** Room 12 seasonal temperature setpoints (acceptable ±1 °C). Months are 1-12. */
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
