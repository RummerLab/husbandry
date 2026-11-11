/**
 * Room 6 (egg room) layout, mirroring the lab's "Room 6 Records 2026" workbook (#99).
 * Each Room 6 module writes to its own master-sheet tab with these operational columns,
 * followed by the four provenance columns. Keep scripts/setup-room6.mjs in step (a test checks this).
 */

/** LSS and Maintenance: per-tank clean tasks. Tank 8 is the egg tank, with only three tasks. */
export const ROOM6_CLEAN_TASKS = {
	siphon: 'Siphon',
	sandVac: 'Sand Vac',
	overflow: 'O/f',
	scrubWalls: 'Scrub walls',
	scrubPipes: 'Scrub Pipes',
	sandChange: 'Sand Change'
} as const;
export type Room6CleanTask = keyof typeof ROOM6_CLEAN_TASKS;

const ALL_TASKS = Object.keys(ROOM6_CLEAN_TASKS) as Room6CleanTask[];
export const ROOM6_LSS_TANKS: { id: string; name: string; tasks: Room6CleanTask[] }[] = [
	{ id: '1', name: 'Tank 1', tasks: ALL_TASKS },
	{ id: '2', name: 'Tank 2', tasks: ALL_TASKS },
	{ id: '3', name: 'Tank 3', tasks: ALL_TASKS },
	{ id: '4', name: 'Tank 4', tasks: ALL_TASKS },
	{ id: '5', name: 'Tank 5', tasks: ALL_TASKS },
	{ id: '6', name: 'Tank 6', tasks: ALL_TASKS },
	{ id: '7', name: 'Tank 7', tasks: ALL_TASKS },
	{ id: '8', name: 'Tank 8 (eggs)', tasks: ['siphon', 'scrubWalls', 'scrubPipes'] },
	{ id: '9', name: 'Tank 9', tasks: ALL_TASKS }
];

/** Flat field key for one tank task, e.g. tank8_scrubWalls. */
export const tankTaskKey = (tankId: string, task: Room6CleanTask) => `tank${tankId}_${task}`;
export const ROOM6_TANK_TASK_KEYS = ROOM6_LSS_TANKS.flatMap(tank => tank.tasks.map(task => tankTaskKey(tank.id, task)));

/** Non-tank LSS tick boxes (done = 'Y', not done = ''). */
export const ROOM6_LSS_TICKS = ['sumpVac', 'biofilterClean', 'gutterVac', 'gutterScrub'] as const;
/** Daily flow checks: an explicit Y/N answer is required. */
export const ROOM6_LSS_FLOWS = ['biofilterFlowAir', 'biofilterFlowWater', 'tankFlowAir', 'tankFlowWater'] as const;
export const ROOM6_WATER_CHANGE = { None: '', '25%': 0.25, '50%': 0.5, '75%': 0.75, '100%': 1 } as const;
export const ROOM6_TOP_UP = ['None', 'Fresh', 'Salt'] as const;

export const ROOM6_HEADERS = {
	room6Eggs: ['Date', 'Initials', 'Candling completed', 'Wind eggs (how many)', 'Wind eggs (IDs)', 'New eggs (how many)', 'New eggs (IDs)', 'Embryos developed (how many)', 'Embryos developed (IDs)', 'Dead eggs (how many)', 'Dead eggs (IDs)', 'Notes'],
	room6WaterQuality: ['Date', 'Initials', 'Temp (°C)', 'pH', 'Salinity (ppt)', 'DO%', 'Alk (dKH)', 'pH (weekly)', 'NH3 (ppm)', 'NO2 (ppm)', 'NO3 (ppm)', 'PO4 (ppm)', 'Notes'],
	room6Lss: [
		'Date', 'Initials',
		...ROOM6_LSS_TANKS.flatMap(tank => tank.tasks.map(task => `${tank.name}: ${ROOM6_CLEAN_TASKS[task]}`)),
		'Sump: Water Change', 'Sump: Top Up', 'Sump: Vac', 'Biofilter: Clean',
		'Biofilter Flow: Air', 'Biofilter Flow: Water', 'Tank Flow: Air', 'Tank Flow: Water',
		'Gutters: Vac', 'Gutters: Scrub', 'Notes'
	],
	room6Ammonia: ['Date', 'Time', 'Initials', 'Ammonia (ppm)', 'Nitrite (ppm)', 'Notes']
} as const;

export const ROOM6_TABS = {
	room6Eggs: 'Room 6 Egg Checks',
	room6WaterQuality: 'Room 6 Water Quality',
	room6Lss: 'Room 6 LSS',
	room6Ammonia: 'Room 6 Ammonia + Nitrite'
} as const;
export type Room6Module = keyof typeof ROOM6_TABS;
