export type WorkType = "artwork" | "song" | "album" | "movie";
export type EntryStatus = "saved" | "experienced";
export type Reaction = "liked" | "mixed" | "not_for_me" | null;

export interface Work {
  id: string;
  type: WorkType;
  title: string;
  creator: string;
  year: string;
  createdAt: string;
}

export interface JournalEntry {
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

export interface Journal {
  version: 1;
  works: Work[];
  entries: JournalEntry[];
}

export interface EntryInput {
  type: WorkType;
  title: string;
  creator: string;
  year: string;
  date: string;
  status: EntryStatus;
  reaction: Reaction;
  toExplore: boolean;
  tags: string[];
  notes: string;
}

export const STORAGE_KEY = "still-journal-v1";

// This shared template is immutable; reads and writes always produce new arrays.
export const EMPTY_JOURNAL: Journal = Object.freeze({
  version: 1,
  works: Object.freeze([]) as unknown as Work[],
  entries: Object.freeze([]) as unknown as JournalEntry[],
});

const workTypes: readonly string[] = ["artwork", "song", "album", "movie"];
const statuses: readonly string[] = ["saved", "experienced"];
const reactions: readonly unknown[] = [null, "liked", "mixed", "not_for_me"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function isYear(value: unknown): value is string {
  return (
    typeof value === "string" && (value === "" || /^[12]\d{3}$/.test(value))
  );
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function validateInput(input: EntryInput): EntryInput {
  if (!workTypes.includes(input.type))
    throw new Error("Choose artwork, song, album, or movie.");
  if (!isNonemptyString(input.title))
    throw new Error("Add a title for this work.");
  if (typeof input.creator !== "string")
    throw new Error("The artist, musician, or director must be text.");
  if (!isYear(input.year))
    throw new Error(
      "Use a four-digit year from 1000 to 2999, or leave it blank.",
    );
  if (!isDate(input.date))
    throw new Error("Choose a valid date for your entry.");
  if (!statuses.includes(input.status))
    throw new Error("Choose saved or experienced for this entry.");
  if (!reactions.includes(input.reaction))
    throw new Error("Choose a valid reaction, or leave it blank.");
  if (input.status === "saved" && input.reaction !== null) {
    throw new Error("Experience a work before recording a reaction.");
  }
  if (typeof input.toExplore !== "boolean")
    throw new Error("Choose whether you want to explore this work.");
  if (
    !Array.isArray(input.tags) ||
    !input.tags.every((tag) => typeof tag === "string")
  ) {
    throw new Error("Tags must be text.");
  }
  if (typeof input.notes !== "string") throw new Error("Notes must be text.");
  return {
    ...input,
    title: input.title.trim(),
    creator: input.creator.trim(),
    tags: normalizeTags(input.tags),
  };
}

function validateJournal(value: unknown): Journal {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.works) ||
    !Array.isArray(value.entries)
  ) {
    throw new Error("The saved journal has an unsupported format.");
  }
  const workIds = new Set<string>();
  const works: Work[] = value.works.map((work: unknown) => {
    if (
      !isRecord(work) ||
      !isNonemptyString(work.id) ||
      workIds.has(work.id) ||
      typeof work.type !== "string" ||
      !workTypes.includes(work.type) ||
      !isNonemptyString(work.title) ||
      typeof work.creator !== "string" ||
      !isYear(work.year) ||
      !isTimestamp(work.createdAt)
    ) {
      throw new Error("The saved journal contains invalid work information.");
    }
    workIds.add(work.id);
    return {
      id: work.id,
      type: work.type as WorkType,
      title: work.title,
      creator: work.creator,
      year: work.year,
      createdAt: work.createdAt,
    };
  });
  const entryIds = new Set<string>();
  const entries: JournalEntry[] = value.entries.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      !isNonemptyString(entry.id) ||
      entryIds.has(entry.id) ||
      typeof entry.workId !== "string" ||
      !workIds.has(entry.workId) ||
      !isDate(entry.date) ||
      typeof entry.status !== "string" ||
      !statuses.includes(entry.status) ||
      !reactions.includes(entry.reaction) ||
      (entry.status === "saved" && entry.reaction !== null) ||
      typeof entry.toExplore !== "boolean" ||
      typeof entry.notes !== "string" ||
      !Array.isArray(entry.tags) ||
      !entry.tags.every((tag) => typeof tag === "string") ||
      !isTimestamp(entry.createdAt)
    ) {
      throw new Error(
        "The saved journal contains an invalid entry or a missing work.",
      );
    }
    entryIds.add(entry.id);
    return {
      id: entry.id,
      workId: entry.workId,
      date: entry.date,
      status: entry.status as EntryStatus,
      reaction: entry.reaction as Reaction,
      toExplore: entry.toExplore,
      tags: [...entry.tags] as string[],
      notes: entry.notes,
      createdAt: entry.createdAt,
    };
  });
  return { version: 1, works, entries };
}

function makeId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export function addEntry(
  journal: Journal,
  input: EntryInput,
  existingWorkId?: string,
): {
  journal: Journal;
  work: Work;
  entry: JournalEntry;
} {
  const validated = validateInput(input);
  const existingWork =
    existingWorkId === undefined
      ? undefined
      : journal.works.find((work) => work.id === existingWorkId);
  if (existingWorkId !== undefined && !existingWork)
    throw new Error("This work could not be found in your library.");
  const createdAt = new Date().toISOString();
  const work: Work = existingWork ?? {
    id: makeId(),
    type: validated.type,
    title: validated.title,
    creator: validated.creator,
    year: validated.year,
    createdAt,
  };
  const entry: JournalEntry = {
    id: makeId(),
    workId: work.id,
    date: validated.date,
    status: validated.status,
    reaction: validated.reaction,
    toExplore: validated.toExplore,
    tags: validated.tags,
    notes: validated.notes,
    createdAt,
  };
  return {
    journal: {
      version: 1,
      works: existingWork ? [...journal.works] : [...journal.works, work],
      entries: [...journal.entries, entry],
    },
    work,
    entry,
  };
}

export function editEntry(
  journal: Journal,
  entryId: string,
  input: EntryInput,
): Journal {
  const original = journal.entries.find((entry) => entry.id === entryId);
  if (!original)
    throw new Error("This entry could not be found in your journal.");
  const originalWork = journal.works.find(
    (work) => work.id === original.workId,
  );
  if (!originalWork)
    throw new Error("This work could not be found in your library.");
  const validated = validateInput(input);
  const work: Work = {
    ...originalWork,
    type: validated.type,
    title: validated.title,
    creator: validated.creator,
    year: validated.year,
  };
  const entry: JournalEntry = {
    ...original,
    date: validated.date,
    status: validated.status,
    reaction: validated.reaction,
    toExplore: validated.toExplore,
    tags: validated.tags,
    notes: validated.notes,
  };
  return {
    version: 1,
    works: journal.works.map((item) =>
      item.id === original.workId ? work : item,
    ),
    entries: journal.entries.map((item) =>
      item.id === entryId ? entry : item,
    ),
  };
}

export function deleteEntry(journal: Journal, entryId: string): Journal {
  const original = journal.entries.find((entry) => entry.id === entryId);
  if (!original)
    throw new Error("This entry could not be found in your journal.");
  const entries = journal.entries.filter((entry) => entry.id !== entryId);
  const stillReferenced = entries.some(
    (entry) => entry.workId === original.workId,
  );
  return {
    version: 1,
    works: stillReferenced
      ? [...journal.works]
      : journal.works.filter((work) => work.id !== original.workId),
    entries,
  };
}

export function deleteWork(journal: Journal, workId: string): Journal {
  if (!journal.works.some((work) => work.id === workId)) {
    throw new Error("This work could not be found in your library.");
  }
  return {
    version: 1,
    works: journal.works.filter((work) => work.id !== workId),
    entries: journal.entries.filter((entry) => entry.workId !== workId),
  };
}

export function readJournal(storage?: Pick<Storage, "getItem">): Journal {
  let raw: string | null;
  try {
    raw = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY);
  } catch {
    throw new Error(
      "Your browser could not read the journal. Allow local storage to access your entries.",
    );
  }
  if (raw === null) return { version: 1, works: [], entries: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "Your saved journal could not be read. Its data is still preserved in this browser.",
    );
  }
  try {
    return validateJournal(parsed);
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : "Your saved journal could not be read."} Its data is still preserved in this browser.`,
    );
  }
}

export function writeJournal(
  journal: Journal,
  storage?: Pick<Storage, "setItem">,
): void {
  const validated = validateJournal(journal);
  try {
    (storage ?? globalThis.localStorage).setItem(
      STORAGE_KEY,
      JSON.stringify(validated),
    );
  } catch {
    throw new Error(
      "Your browser could not save this entry. Storage may be full or disabled. Your previous journal is unchanged.",
    );
  }
}

function newestFirst(a: JournalEntry, b: JournalEntry): number {
  return (
    b.date.localeCompare(a.date) ||
    b.createdAt.localeCompare(a.createdAt) ||
    b.id.localeCompare(a.id)
  );
}

export function latestEntry(
  journal: Journal,
  workId: string,
): JournalEntry | undefined {
  return journal.entries
    .filter((entry) => entry.workId === workId)
    .sort(newestFirst)[0];
}

export function latestExperiencedEntry(
  journal: Journal,
  workId: string,
): JournalEntry | undefined {
  return journal.entries
    .filter(
      (entry) => entry.workId === workId && entry.status === "experienced",
    )
    .sort(newestFirst)[0];
}

export function workState(
  journal: Journal,
  workId: string,
): {
  saved: boolean;
  experienced: boolean;
  liked: boolean;
  toExplore: boolean;
} {
  const latest = latestEntry(journal, workId);
  const experienced = latestExperiencedEntry(journal, workId);
  return {
    saved: Boolean(latest && !experienced),
    experienced: Boolean(experienced),
    liked: experienced?.reaction === "liked",
    toExplore: latest?.toExplore ?? false,
  };
}

export function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
