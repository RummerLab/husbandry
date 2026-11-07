import { redirect } from '@sveltejs/kit';

// The server hook performs the browser's Basic challenge before this handler.
export const GET = () => redirect(303, '/');
