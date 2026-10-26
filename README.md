# FMD Folio — NHDCL E‑Library

A flipbook library: admins upload PDFs, everyone else browses the shelves and reads.

```
public/index.html   the whole app (one self-contained page)
api/books.js        GET the book list · POST add / edit / remove (admin)
api/upload.js       lets the admin's browser upload PDFs straight to Vercel Blob
api/login.js        checks the admin password
api/_lib.js         shared helpers (not a route)
```

## Deploy (one time)

1. Put this folder in a GitHub repo and import it at vercel.com/new
   (Framework preset: **Other**. No build command needed.)
2. In the project: **Storage → Create → Blob**, choose **Public** access,
   and connect it to the project.
   Then check **Settings → Environment Variables** has `BLOB_READ_WRITE_TOKEN`.
   If it isn't there, open the Blob store, copy its read-write token
   (`vercel_blob_rw_…`), and add it yourself as `BLOB_READ_WRITE_TOKEN`
   for Production and Preview. Uploads can't work without it.
3. **Settings → Environment Variables** → add `ADMIN_PASSWORD` = a strong password.
4. **Deployments → Redeploy** so the new settings take effect.

## Managing books (admin)

1. Open the site and tap **Admin** (top right). Enter the password.
2. **Add PDFs**: drag files onto the page or use the button. Each file is uploaded
   and appears on the shelf for everyone.
3. Tap a book, then **Edit details & cover** to change title, author, shelf or cover.
4. **Manage view** (list icon) lets you move or remove several books at once.
5. Tap the sign-out icon when you're done. Your sign-in is remembered on that browser until then.

Readers never see the add, edit or remove buttons.

## Notes

- To change the admin password, update `ADMIN_PASSWORD` and redeploy. Everyone signed in is signed out.
- PDFs up to 250 MB are accepted. Large files upload in parts automatically.
- Removing a book also deletes its PDF and cover from Blob storage.
- The book list is stored in Blob as `library/books.json`. Download it from the Blob browser as a backup.

## Troubleshooting uploads

"Failed to retrieve the client token" means `/api/upload` refused the request. The app
now tells you why. The usual causes:

| Message | Fix |
|---|---|
| BLOB_READ_WRITE_TOKEN is missing | Add it in Settings → Environment Variables, then **redeploy** |
| No Blob store is connected | Storage → your Blob store → Connect Project, then redeploy |
| Your admin session ended | Sign out and sign in again (the password changed) |
| Blob store is Private | Create a **Public** Blob store and connect that one instead |

Environment variable changes only apply after a redeploy. Function errors are listed under
**Logs** in the Vercel dashboard (look for `upload token error`).
