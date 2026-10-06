# Still

A mobile-first, private taste journal for art, songs, albums, and movies. Work metadata is separate from dated personal entries. All entry data stays in this browser; there are no accounts, external catalogs, paid services, analytics, or cloud synchronization.

See [the product brief, screen flows, data model, and implementation plan](docs/product-plan.md).

The four screens support manual entries, optional reactions, dated history, tags/notes, an explore list, editing/deletion, library search/filters, and a descriptive taste summary. A separate, explicitly labeled sample library uses fictional journal notes and local illustrative covers.

See [verified behavior and limitations](docs/verification.md) for the staged implementation and the final 44 model tests and 24 desktop/mobile browser checks.

For a ready-to-run desktop copy, see [opening the app](docs/opening-the-app.md) and the portable package at `downloads/Still.zip`. Workspace links in the cloud setup chat are not live previews or downloadable attachments.

## Development

Requires Node.js 22.12+ and npm. The cloud environment supplies Node 24 and Chromium.

```sh
cd /workspace/Apptest
npm ci --cache /tmp/apptest-npm-cache --no-audit --no-fund
npm run dev -- --port 5173
```

Use the existing checkout: cloud tasks already have an isolated environment and do not need another Git worktree.

## Validation

```sh
npm test
npm run build
npm run test:e2e
```

The build includes a strict TypeScript check. Playwright runs desktop and phone-size workflows with the system Chromium at `/usr/bin/chromium`. On another machine, adjust the configured executable path to a trusted installed Chromium. The test runner starts its own development server when needed.

## Data and privacy

The versioned document in `localStorage` uses the key `still-journal-v1`. This is browser-local persistence, not encrypted storage. People with access to the same browser profile can read it, and clearing site data removes it. A corrupted document is kept rather than silently overwritten; write failures leave the previous journal and form intact. Sample records are separate from personal records.

No publication or deployment is part of this work.
