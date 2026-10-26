// GET  /api/books            → { books }            (anyone)
// POST /api/books {action}   → { books }            (admin only: add | update | remove)
import { del } from '@vercel/blob';
import { readManifest, updateManifest, isAdmin, json, isBlobUrl } from './_lib.js';

const EDITABLE = ['title', 'author', 'category', 'description', 'coverMode', 'coverColor', 'coverStyle', 'favorite'];
const str = (v, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');

function cleanBook(b) {
  return {
    id: str(b.id, 64) || Math.random().toString(36).slice(2, 12),
    title: str(b.title, 300) || 'Untitled',
    author: str(b.author, 200),
    category: str(b.category, 80) || 'Uncategorized',
    description: str(b.description, 4000),
    pages: Number(b.pages) || 0,
    aspect: Number(b.aspect) || 0.707,
    size: Number(b.size) || 0,
    addedAt: Number(b.addedAt) || Date.now(),
    coverMode: b.coverMode === 'design' ? 'design' : 'pdf',
    coverColor: /^#[0-9a-f]{6}$/i.test(b.coverColor) ? b.coverColor : '#2f4a3a',
    coverStyle: ['classic', 'modern', 'minimal'].includes(b.coverStyle) ? b.coverStyle : 'classic',
    favorite: !!b.favorite,
    pdfRef: isBlobUrl(b.pdfRef) ? b.pdfRef : '',
    thumbRef: isBlobUrl(b.thumbRef) ? b.thumbRef : '',
  };
}

export async function GET() {
  try {
    const { books } = await readManifest();
    return json({ books });
  } catch (e) {
    return json({ error: 'Could not load the library.', detail: String(e?.message || e) }, 500);
  }
}

export async function POST(request) {
  if (!isAdmin(request)) return json({ error: 'Admin sign-in required.' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400); }

  try {
    if (body.action === 'add') {
      const book = cleanBook(body.book || {});
      if (!book.pdfRef) return json({ error: 'Missing PDF.' }, 400);
      const books = await updateManifest(list => [book, ...list.filter(b => b.id !== book.id)]);
      return json({ books, book });
    }
    if (body.action === 'update') {
      const patch = {};
      for (const k of EDITABLE) if (k in (body.patch || {})) patch[k] = body.patch[k];
      const books = await updateManifest(list =>
        list.map(b => (b.id === body.id ? cleanBook({ ...b, ...patch }) : b)),
      );
      return json({ books });
    }
    if (body.action === 'remove') {
      let removed = null;
      const books = await updateManifest(list => {
        removed = list.find(b => b.id === body.id) || null;
        return list.filter(b => b.id !== body.id);
      });
      if (removed) {
        const urls = [removed.pdfRef, removed.thumbRef].filter(isBlobUrl);
        if (urls.length) await del(urls).catch(() => {});
      }
      return json({ books });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    return json({ error: String(e?.message || 'Could not save.') }, 500);
  }
}
