export interface TankDefinition {
	id: string;
	name: string;
	targetAmt: string;
	medicationType: 'Elasmotab' | 'Formula' | 'None';
	retired?: boolean;
	sharks: Array<{
		id: string;
		label: string;
		medId?: string;
	}>;
}

export const ALL_ROOM12_TANKS: TankDefinition[] = [
	{
		id: 'tank1',
		name: 'Tank 1',
		targetAmt: '58g',
		medicationType: 'Elasmotab',
		sharks: [
			{ id: 'HO107', label: 'HO107 (M)', medId: '107' },
			{ id: 'HO103', label: 'HO103 (F)', medId: '103' }
		]
	},
	{
		id: 'tank2_far_right',
		name: 'Tank 2 (Far Right)',
		targetAmt: '',
		medicationType: 'Formula',
		sharks: [
			{ id: 'AM084', label: 'AM084', medId: '84' },
			{ id: 'AM085', label: 'AM085', medId: '85' }
		]
	},
	{
		id: 'tank2_mid_right',
		name: 'Tank 2 (Mid Right)',
		targetAmt: '',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO093', label: 'HO093', medId: '73' },
			{ id: 'AM081', label: 'AM081', medId: '81' }
		]
	},
	{
		id: 'tank2_mid_left',
		name: 'Tank 2 (Mid Left)',
		targetAmt: '',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO006', label: 'HO006 (M)', medId: '6' },
			{ id: 'AM010', label: 'AM010 (F)', medId: '10' }
		]
	},
	{
		id: 'tank2_far_left',
		name: 'Tank 2 (Far Left)',
		targetAmt: '',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO076', label: 'HO076 (F)', medId: '76' }
		]
	},
	{
		id: 'tank3',
		name: 'Tank 3',
		targetAmt: '58g',
		medicationType: 'Elasmotab',
		sharks: [
			{ id: 'HO106', label: 'HO106 (M)', medId: '106' },
			{ id: 'HO116', label: 'HO116 (F)', medId: '116' }
		]
	},
	{
		id: 'tank4',
		name: 'Tank 4',
		targetAmt: '64g',
		medicationType: 'Elasmotab',
		sharks: [
			{ id: 'HO105', label: 'HO105 (F)', medId: '105' },
			{ id: 'HO110', label: 'HO110 (M)', medId: '110' }
		]
	},
	{
		id: 'tank5_green_lid',
		name: 'Tank 5 (Green lid)',
		targetAmt: '3g',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO123', label: 'HO123 (M)', medId: '123' },
			{ id: 'HO126', label: 'HO126 (F)', medId: '126' }
		]
	},
	{
		id: 'tank5_big_tub',
		name: 'Tank 5 (Big tub)',
		targetAmt: '4g',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO134', label: 'HO134 (M)', medId: '134' },
			{ id: 'HO135', label: 'HO135 (F)', medId: '135' }
		]
	},
	{
		id: 'tank5_egg_crate',
		name: 'Tank 5 (Egg crate)',
		targetAmt: '2g',
		medicationType: 'Formula',
		sharks: [
			{ id: 'AM059', label: 'AM059 (F)', medId: '59' },
			{ id: 'AM077', label: 'AM077 (M)', medId: '77' }
		]
	},
	{
		id: 'tank6_big_tub_middle',
		name: 'Tank 6 (Big Tub in Middle)',
		targetAmt: '3g',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO125', label: 'HO125 (F)', medId: '125' },
			{ id: 'HO147', label: 'HO147 (M)', medId: '147' }
		]
	},
	{
		id: 'tank6_green_lid',
		name: 'Tank 6 (Green Lid)',
		targetAmt: '1g',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO099', label: 'HO099 (M)', medId: '99' }
		]
	},
	{
		id: 'historic_tank6_green_lid',
		name: 'Historic Tank 6 (Green Lid)',
		targetAmt: '1g',
		medicationType: 'Formula',
		retired: true,
		sharks: [
			{ id: 'AM081_M', label: 'AM081 (M)', medId: '81' }
		]
	},
	{
		id: 'tank6_big_tub_right',
		name: 'Tank 6 (Big Tub on right)',
		targetAmt: '3g',
		medicationType: 'Formula',
		sharks: [
			{ id: 'AM082_prime', label: "AM082' (M)", medId: "082'" },
			{ id: 'HO057', label: 'HO057 (F)', medId: '57' }
		]
	},
	{
		id: 'tank7_historic_tank2',
		name: 'Tank 7 (Historically in Tank 2)',
		targetAmt: '61g',
		medicationType: 'Elasmotab',
		sharks: [
			{ id: 'HO102', label: 'HO102 (F)', medId: '102' },
			{ id: 'HO109', label: 'HO109 (M)', medId: '109' }
		]
	},
	{
		id: 'historic_tank7',
		name: 'Historic Tank 7',
		targetAmt: '21g',
		medicationType: 'Elasmotab',
		retired: true,
		sharks: [
			{ id: 'HO117_T7', label: 'HO117', medId: '117' }
		]
	},
	{
		id: 'tank8',
		name: 'Tank 8',
		targetAmt: '55g',
		medicationType: 'Formula',
		sharks: [
			{ id: 'HO117_T8', label: 'HO117', medId: '117' },
			{ id: 'HO119', label: 'HO119', medId: '119' },
			{ id: 'HO120', label: 'HO120', medId: '120' },
			{ id: 'HO121', label: 'HO121', medId: '121' }
		]
	}
];

/** Active tanks displayed for daily feeding entry and Lab Overview (#140). */
export const ROOM12_TANKS: TankDefinition[] = ALL_ROOM12_TANKS.filter(tank => !tank.retired);
