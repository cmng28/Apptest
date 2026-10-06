# Verified behavior

The repository was empty at the start of this work. The product brief, screen flows, data model, and phased tasks were written before application implementation.

## Staged implementation

The first milestone implemented only the complete manual add/save/retrieve workflow and four-screen shell. Before expanding features, it passed 35 model tests, 6 desktop/mobile browser checks, and the TypeScript/production build. The browser checks exercised saved and experienced entries, reload persistence, and storage failure with the form retained.

History, editing, deletion, filters, sample records, and descriptive taste summaries were added after that milestone passed. Review findings were corrected: hash navigation for the skip link, stale-tab overwrites, missing edit targets, reaction clearing when switching to saved, deletion-dialog focus, search-field accessible naming, and low-contrast text.

## Final checks

| Command/check | Verified result |
| --- | --- |
| `npm ci --cache /tmp/apptest-npm-cache --no-audit --no-fund` | Clean installation from the lockfile succeeded. TLS and package integrity checks were retained. |
| `npm run build` | Strict TypeScript check and Vite production build passed. |
| `npm test` | 44 tests passed; none skipped. |
| `npm run test:e2e` | 24 tests passed in one final run; none skipped. Twelve scenarios ran on desktop Chromium and mobile Chromium. |
| Desktop and phone screenshots | Visually inspected empty and sample libraries plus My Taste. |
| Narrow layout | All four primary screens fit a 320px viewport without horizontal overflow. |
| Local network observation | Library/sample/taste navigation made no requests to external hosts. App code contains no external catalog, analytics, or remote journal service. |

The final checks ran after refreshing dependencies with the same reusable install script saved in the environment draft. Browser tests also started a fresh development server, demonstrating startup after the previous process was stopped.

### Model coverage

All four work types, optional creator and reaction, validated dates/year/type/status, tag normalization, immutable appends, deterministic dated preference ordering, separate metadata and personal entries, corrupt/unsupported documents, write errors, editing one historical record, and deleting one or all entries.

### Browser coverage

- Manual movie entry with creator/year, dated liked reaction, explore mark, tags, and notes; details, reload, library retrieval, and separately persisted records.
- Saved-only entries and experienced entries without reactions.
- Storage-quota failure retains the draft and avoids a false save; corrupted existing data is preserved and cannot be overwritten.
- New dated entries preserve older reactions. Editing metadata and one entry preserves the other entries. Individual and whole-item deletion include cancellation; removing the final entry also removes its work.
- Taste liked counts change with newer reactions and restore after deleting that reaction.
- Clearly labeled samples never enter personal storage. Copying a sample takes only work metadata; sample notes, reaction, tags, date, and explore intent are not copied.
- Search covers title/creator and historical tags. Medium/status filters combine, including saved-only, liked, and explore.
- A stale second tab cannot overwrite a newer journal; its draft remains visible.
- Keyboard skip link retains the route/draft. Deletion dialogs focus the safe action, restore their trigger on cancellation, and focus main content when the removed trigger no longer exists.

## Scope and limits

This is a browser-local, single-user MVP. Storage is not encrypted; there is no account, automatic cross-device synchronization, external catalog, social network, or recommendation engine. Clearing browser site data removes personal records. Failed saves retain the current form, but general navigation does not persist an unfinished draft. Manual backup/export and restore were added during the requested iPhone preparation below.

Automated browser verification used system Chromium at desktop/phone-size viewports; real-device Safari and Firefox were not tested. Targeted accessibility checks covered keyboard focus, labels, contrast, and layout, rather than a complete accessibility audit.

`install_script` and `start_skill` were saved to the cloud environment configuration draft. Draft saving is separate from runtime execution and environment publication. No app deployment, paid service, or publication was performed; restoration into a new published task has not been tested.

## iPhone preparation

- 58 model/backup tests passed, including all 44 original tests, full backup round-trip, schema rejection, size limits and sample isolation.
- All 30 desktop/mobile browser tests passed, including the original 24 workflows. The 6 affected backup checks passed again after improving the local-date filename. File sharing was simulated to verify that the correct file is supplied and cancellation is reported honestly; a native iPhone share sheet was not exercised.
- The strict TypeScript and production build passed. Two additional production browser checks passed under `/Apptest/`, verifying relative assets, Home Screen metadata, every icon's PNG dimensions, service-worker scope, readiness status, offline reload/fresh-tab reopening and offline editing.
- iPhone safe-area CSS and viewport settings are included. Real-device Safari installation still needs a check after approved HTTPS hosting. Downloading Playwright WebKit was blocked by network policy at the official download destinations; no trust checks were disabled and no Safari pass is claimed.
- The complete static-site ZIP and a manual-only GitHub Pages workflow are prepared. The workflow's only trigger is `workflow_dispatch`; source pushes do not deploy a site. Account eligibility for free Pages could not be checked through the blocked API route. No website, paid service, repository-visibility change, or plan upgrade was made.
- The refreshed desktop ZIP was opened through local HTTP at a phone-size viewport. Adding an entry, downloading a backup containing its note, and retrieving it after reload passed with zero page errors or external requests. Both ZIP archives passed integrity checks; the hosted ZIP's files exactly matched the tested production build. Repeated packaging retains one copy of the transfer instructions.
