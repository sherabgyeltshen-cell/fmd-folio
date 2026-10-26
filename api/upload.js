// POST /api/upload — issues short-lived upload tokens so the browser can send
// PDFs straight to Vercel Blob (no 4.5 MB function body limit). Admin only.
// GET  /api/upload — admin-only setup check, used to explain upload failures.
import { handleUpload } from '@vercel/blob/client';
import { isAdmin, json } from './_lib.js';

const setup = () => ({
  adminPassword: !!process.env.ADMIN_PASSWORD,
  // Client uploads must be signed with the store's read-write token.
  readWriteToken: !!process.env.BLOB_READ_WRITE_TOKEN,
  storeConnected: !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID),
});

export async function GET(request) {
  if (!isAdmin(request)) return json({ error: 'Admin sign-in required.' }, 401);
  return json(setup());
}

export async function POST(request) {
  if (!isAdmin(request)) return json({ error: 'Admin sign-in required.' }, 401);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json({ error: 'BLOB_READ_WRITE_TOKEN is not set on the server.', ...setup() }, 500);
  }
  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async pathname => {
        if (!/^(books|covers)\//.test(pathname)) throw new Error('Invalid upload path.');
        return {
          allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 250 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return json(result);
  } catch (e) {
    console.error('upload token error:', e);
    return json({ error: String(e?.message || 'Upload failed.') }, 400);
  }
}
