import { json } from '@sveltejs/kit';

export const GET = () => json({ status: 'ok', appName: 'RummerLab Room 12 Husbandry App' }, { headers: { 'Cache-Control': 'no-store' } });
