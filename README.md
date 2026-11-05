# Son Rhey & Therese — full wedding website source

This export includes the latest published invitation, envelope animations, fixed booklet layout, image gallery, mobile styles, and Google Sheets integration. No ChatGPT hosting account is required to run this export.

## Files to edit

- `public/index.html`: names, dates, wedding details, and form fields.
- `public/styles.css`: layout, typography, paper, envelope and animation styling.
- `public/app.js`: envelope sequence, page flips, gallery, and RSVP submission.
- `public/assets/engagement.webp` and `bouquet.webp`: bundled illustrative photos. Replace with your prenup photos using the same names, or update the references in HTML and CSS. Remove the illustrative-photo labels after replacing them. Adjust `object-position` and `background-position` for your chosen photos.
- `server/api.js`: RSVP validation, backup, and Google Apps Script forwarding.
- `server.mjs`: dependency-free Node HTTP server.
- `cloudflare.js` / `wrangler.jsonc`: alternative Cloudflare Workers deployment.
- `original/worker.js`: exact original published Worker source, with embedded frontend and image data. This snapshot is for reference; the portable server uses the editable files above.

## Option A — Node hosting (VPS, Render, Railway, or Docker)

Requires Node.js 22 or newer. There are no application npm dependencies.

1. Extract the ZIP and open a terminal in this folder.
2. Copy `.env.example` to `.env`.
3. Set `RSVP_SHEETS_WEBHOOK` to your existing Google Apps Script URL ending in `/exec`.
4. Run `npm start` and open `http://localhost:3000`.
5. On your hosting provider, use `npm start` as the start command, Node 22+, and configure `RSVP_SHEETS_WEBHOOK` as a private environment variable.
6. Set `PUBLIC_ORIGIN` to your final website origin, e.g. `https://your-domain.com` (no trailing slash). This is required behind an HTTPS reverse proxy because the form rejects requests with a different Origin.
7. Put HTTPS in front of the Node server. Allow the provider's PORT environment variable. For Docker, build this folder and pass runtime environment variables to the container.
8. Optionally mount persistent storage and set `DATA_DIR` to that path. Local JSON backups are written there; they are not public website files. Ephemeral hosting may discard these backups, while successfully acknowledged Google Sheet rows remain in Google.

Docker example:

```sh
docker build -t wedding-rsvp .
docker run --env-file .env -p 3000:3000 wedding-rsvp
```

## Option B — Cloudflare Workers

The supplied configuration uses static assets plus an R2 bucket for private RSVP backups. Requires a Cloudflare account with the relevant products enabled and Wrangler CLI.

```sh
npx wrangler login
npx wrangler r2 bucket create wedding-rsvp-backups
npx wrangler secret put RSVP_SHEETS_WEBHOOK
npx wrangler deploy
```

Paste your existing Apps Script `/exec` URL at the secret prompt. If that bucket name is already used in your account, choose a different one and update `wrangler.jsonc`. For local Wrangler development, put the webhook in `.dev.vars`, and run `npx wrangler dev`.

## Google Sheets

Reuse the web app you already deployed. It must accept JSON containing `name`, `email`, `attendance` (`yes` or `no`), and `message`, then return JSON `{"success":true}` after adding the row. Execute it as your Google account and make the web app accessible to Anyone. The spreadsheet itself can remain private.

The browser posts to the same site's `/api/rsvp`; the server forwards it to Apps Script and follows Google's redirect. The success message appears only when Google returns the expected acknowledgement. The endpoint is configured privately at runtime and is not included in this ZIP. Paste the URL you previously supplied into the environment setting.

After deploying, submit a clearly labeled TEST RSVP and verify it appears in the Google Sheet. Google Sheets live recording could not be verified from the authoring environment due to network restrictions; the forwarding success/failure logic was checked with simulated responses.

## Static hosting limitation

Uploading only `public/` to ordinary static hosting will show the invitation and animations, but RSVP submission also needs the supplied server endpoint. Use Node hosting or Cloudflare Workers for a working RSVP form. Opening `index.html` directly with `file://` is not a deployment.

## Access and privacy

This exported deployment has no ChatGPT sign-in gate. Anyone who can access your own deployed URL can view it and submit an RSVP. The form states the guest policy but does not verify guests against a guest list or enforce seat allocations automatically. The Apps Script URL is not an authentication token; use an access-controlled integration if you later need stronger submission restrictions.

No Git credentials, ChatGPT authentication, project IDs, collected RSVP records, or runtime secrets are included. The original snapshot reads its webhook from an environment variable.

## Validation

Run `npm run check` for JavaScript syntax checks. Check the opening sequence, all three booklet tabs, photo viewer, phone layout, and one live Google Sheets response after deploying.
