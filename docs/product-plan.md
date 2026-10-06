# Personal taste journal — product plan

## Product brief

A private, mobile-first journal for remembering works of art, music and film and recording how they felt at a particular time. The first useful release lets a person manually add a work, save a dated journal entry, and find that entry again after refreshing the page.

The four screens are **My Library**, **Add an Entry**, **Item Details**, and **My Taste**. Work information belongs to the work; reactions, tags, notes and dates belong to the person's journal entries. Multiple entries can describe the same work, so a later reaction does not overwrite an earlier one.

The intended workflow is personal reflection: save something to revisit, record experiencing it, optionally describe a reaction, and return later to see how preferences changed. A liked work is a derived personal preference, not a synonym for a saved or experienced work. “Explore” is a separate intention and can coexist with any reaction.

### Scope and constraints

- Support artworks, songs, albums and movies through manual entry.
- Accept an optional reaction: liked, mixed, or not for me. An experienced work may have no reaction. Saved-only entries do not imply an experience or a reaction.
- Attach notes, tags, an entry date and an optional explore flag to each journal entry.
- Preserve dated history. Allow adding a new entry to an existing work, then editing or deleting individual entries in a later milestone.
- Provide an optional, clearly labeled sample library that is separate from the person's records. Sample data never silently becomes personal data or contributes to personal statistics.
- Use browser-local persistence for this first release. There is no account, cloud synchronization, external catalog, social feed, recommendation engine, paid service or publication step.

“Private” means the app does not transmit the journal to a server. Browser storage is not encrypted, and someone with access to the same browser profile can read it. Clearing site data can remove entries. Cross-device synchronization, authentication, encrypted backup and export are future decisions, not promises of this version.

## Screen flows

Use a readable one-column layout on small screens, touch-friendly controls, visible field labels and a persistent route back to the library. Desktop screens may use extra width without changing the workflow. Status must have a text label and must not depend on color alone.

### My Library

Show personal works with their type, title, creator, current status and latest dated reaction where available. The empty state explains what the journal records and offers **Add an entry** plus a separate **View sample library** action. Sample mode displays a persistent “Sample data” label and offers a clear return to the personal library.

Primary flow:

1. Open My Library.
2. Choose Add an entry.
3. Complete and save the form.
4. Open the saved work's Item Details.
5. Return to My Library and find the work again.
6. Refresh or reopen the app and retrieve the same record from browser storage.

Later enhancements add search and filters for type, saved-only, experienced, liked, and explore. These filters must describe their meaning; “saved-only” specifically means no experience has been recorded for the work.

### Add an Entry

Present two clearly labeled groups:

| Work information | My entry |
| --- | --- |
| Type: artwork, song, album or movie | Entry date, defaulting to today |
| Title, required | Status: saved or experienced |
| Creator, optional | Reaction, optional when experienced |
| Release/creation year, optional | Explore flag |
| | Tags and notes, optional |

Creator is an artist for an artwork, an artist/band for music, and a director or other identifying creator for a movie. The MVP uses one generic creator field rather than requiring external metadata.

For an existing work, open the form from Item Details with that work selected; keep work metadata separate from the new dated entry. The first add/retrieve milestone can begin with new-work creation and add reuse of existing works afterward.

Validate required title, supported type, valid date and plausible optional year. Trim surrounding whitespace, normalize duplicate tags and keep empty optional fields empty. Do not require a reaction. Switching to saved clears any selected reaction, because saved status alone does not establish an experience.

On Save, persist the work and entry together, then show the new Item Details with a visible success message. On a storage failure, preserve the form and show a useful error; never imply the entry was saved. Cancel returns to the previous screen without creating a record. Later milestones should protect an unsaved draft against accidental navigation.

### Item Details

Show work metadata once, followed by dated journal entries in newest-first order. Each entry displays its date, saved/experienced status, optional reaction, explore flag, tags and notes. Missing reaction is labeled “No reaction recorded,” rather than being treated as dislike.

The complete first workflow retrieves the newly saved work by its stable ID and renders its entry. Later actions include **Add another entry**, **Edit entry**, and **Delete entry**. Editing personal fields changes the selected dated record only. Work-information fields update the shared work metadata without rewriting any other entry's reaction, tags or notes. Deleting the final entry for a work removes the now-unused work after a confirmation that names the affected item. Deleting one entry must not remove the work's other entries. A missing or deleted item shows a recoverable state with a link back to My Library.

### My Taste

Summarize the person's own journal using transparent counts: works by medium, experienced works, currently liked works, things to explore and recurring tags. Make the distinction between entries and distinct works explicit. The empty state explains that these observations will appear after entries are added.

Start with descriptive summaries, not taste scores or recommendations. A liked count is based on the latest dated experienced entry for each work. A new reaction can change the current summary while the earlier reaction remains visible in Item Details. Sample data has its own labeled view and is excluded from personal counts.

## Proposed data structure

Use a versioned document in browser storage under `still-journal-v1`. Store only user-entered strings and generated identifiers; do not store credentials. Dates are calendar dates (`YYYY-MM-DD`), avoiding changes caused by timezone conversion. Creation timestamps are ISO timestamps used for deterministic ordering and remain unchanged when an entry is edited. Only a work's title is required; optional creator and year fields use an empty string when omitted.

```ts
type WorkType = "artwork" | "song" | "album" | "movie";
type EntryStatus = "saved" | "experienced";
type Reaction = "liked" | "mixed" | "not_for_me" | null;

interface Work {
  id: string;
  type: WorkType;
  title: string;
  creator: string;
  year: string; // Empty, or a four-digit year from 1000 to 2999.
  createdAt: string;
}

interface JournalEntry {
  id: string;
  workId: string;
  date: string;
  status: EntryStatus;
  reaction: Reaction;
  toExplore: boolean;
  tags: string[];
  notes: string;
  createdAt: string;
}

interface Journal {
  version: 1;
  works: Work[];
  entries: JournalEntry[];
}
```

The form and storage boundary reject a reaction attached to a saved entry. Metadata edits must not rewrite dated reactions. Do not merge works automatically by title: two works can share a title, and a person's manual identifier is more reliable than a guessed match.

### Derived library semantics

| Label | Definition |
| --- | --- |
| All works | Every work referenced by at least one journal entry |
| Saved-only | A work with entries but no experienced entry |
| Experienced | A work with at least one experienced entry |
| Liked | A work whose latest dated experienced entry has reaction `liked` |
| Explore | A work whose latest dated entry has `toExplore: true` |

Order entries by date, then creation timestamp, then ID for a stable tie-break. The latest experienced entry may have no reaction; in that case no current preference is inferred. A newer saved entry does not erase the historical fact that the work has been experienced. Explore is independently determined from the latest entry, so a person can revisit a liked work.

Keep sample works and sample entries in a separate in-memory fixture, with source metadata outside this user document. Never auto-seed sample records into personal browser storage. Validate stored data on load, retain the original data when recovery is necessary, and avoid silently replacing an unreadable document with an empty one.

## Implementation tasks and order

### 1. Establish the app and the complete add/retrieve workflow

1. [x] Inspect and preserve existing repository behavior; document the chosen development, build and test commands.
2. [x] Set up React, TypeScript and Vite with a mobile-first shell and routes for the four screens.
3. [x] Define the work/entry types and versioned browser-storage boundary, including load/save errors and validation.
4. [x] Build the Add an Entry form with manual metadata, optional reaction, date, tags, notes and explore.
5. [x] Save one Work and one JournalEntry as a single document update. Retrieve that work by ID on Item Details and display it in My Library.
6. [x] Verify the complete path from empty library to form to saved detail to library, then reload and retrieve it again. Verify an experienced entry with no reaction, a saved entry with no reaction, validation failures and a failed storage write.

This milestone is complete only when a real user entry survives refresh and is retrieved with the same work information and personal entry fields. A rendered form or an in-memory success message alone is insufficient.

Stage 1 was verified before adding management features: 35 model/storage unit tests and six browser tests passed, including the complete add-and-retrieve workflow.

### 2. Add history and management without regressing the first workflow

1. Add a dated entry to an existing work.
2. Edit and delete entries, with safe cancellation and clear confirmation for deletion.
3. Edit work metadata separately from journal entries.
4. Verify that later dated reactions change current preference summaries while preserving history, and that deleting one entry leaves the others intact.
5. Re-run the original add/retrieve test after each persistence change.

### 3. Add library exploration and My Taste

1. Add manual search and clearly named status/type/explore filters.
2. Implement transparent, distinct-work taste summaries and recurring tags.
3. Add explicit sample mode with persistent labels and no sample-to-personal storage leakage.
4. Verify counts for mixed dated history, same-date ordering, no-reaction entries, deleted entries and sample isolation.

### 4. Finish accessibility and development readiness

1. Test a narrow phone viewport, keyboard navigation, focus after save/errors, accessible labels and a readable empty state.
2. Check navigation directly to details and refreshing a detail route.
3. Run the production build and the repository's available type/lint checks.
4. Report the commands and browser workflows actually run, their outcomes and any unverified behavior. Keep a repeatable local development setup.

No external catalog connection, paid service, hosted deployment or public publication is included. Any later proposal for those changes needs the user's approval before use or publication.

## Implementation status

The four-screen MVP and all stages above are implemented. The complete add/retrieve milestone passed before history and other features were added. The original MVP passed 44 model tests, 24 desktop/mobile browser checks, and the production build after a clean lockfile installation. The later requested iPhone preparation adds Home Screen metadata/icons, offline app files, and personal backup/export/restore in My Taste; it preserves the separate Work/JournalEntry model and existing storage key. See [verification.md](verification.md) and [iphone.md](iphone.md) for the current checks and limits, including browser-local storage and unsaved navigation drafts.
