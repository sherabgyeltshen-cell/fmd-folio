// POST /api/login — checks the admin password (sent as x-admin-key).
import { isAdmin, json } from './_lib.js';

export async function POST(request) {
  if (!process.env.ADMIN_PASSWORD) return json({ error: 'ADMIN_PASSWORD is not set on the server.' }, 500);
  if (isAdmin(request)) return json({ ok: true });
  await new Promise(r => setTimeout(r, 600)); // slow down guessing
  return json({ error: 'Wrong password.' }, 401);
}
