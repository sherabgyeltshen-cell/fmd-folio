// Shared helpers for the FMD Folio API (files starting with "_" are not routes).
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';

export const MANIFEST = 'library/books.json';

/** Read the book list straight from storage (bypassing the CDN cache). */
export async function readManifest() {
  let res = null;
  try {
    res = await get(MANIFEST, { access: 'public', useCache: false });
  } catch (e) {
    if (e?.name !== 'BlobNotFoundError') throw e;
  }
  if (!res || res.statusCode !== 200) return { books: [], etag: null };
  const text = await new Response(res.stream).text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* corrupt → treat as empty */ }
  return { books: Array.isArray(data.books) ? data.books : [], etag: res.blob.etag };
}

/** Write the list only if nobody else changed it since we read it. */
export async function writeManifest(books, etag) {
  await put(MANIFEST, JSON.stringify({ books, updatedAt: Date.now() }), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : {}),
  });
}

/** Read-modify-write with a few retries if two admins save at once. */
export async function updateManifest(mutate) {
  for (let i = 0; i < 4; i++) {
    const { books, etag } = await readManifest();
    const next = await mutate(books.slice());
    try {
      await writeManifest(next, etag);
      return next;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
      await new Promise(r => setTimeout(r, 120 + Math.random() * 200));
    }
  }
  throw new Error('The library was busy. Please try again.');
}

export function isAdmin(request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const got = request.headers.get('x-admin-key') || '';
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(pw).digest();
  return timingSafeEqual(a, b);
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const isBlobUrl = u => {
  try { return new URL(u).hostname.endsWith('.blob.vercel-storage.com'); } catch { return false; }
};
