import { json } from '@sveltejs/kit';

// This route is always gated by hooks.server.ts and never cached by the PWA.
export const GET = () => json({ authorized: true }, { headers: { 'Cache-Control': 'no-store' } });
