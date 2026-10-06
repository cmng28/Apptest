import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addEntry,
  deleteEntry,
  deleteWork,
  editEntry,
  EMPTY_JOURNAL,
  latestEntry,
  latestExperiencedEntry,
  readJournal,
  STORAGE_KEY,
  todayDate,
  workState,
  writeJournal,
  type EntryInput,
  type Journal,
} from "./journal";

const input: EntryInput = {
  type: "album",
  title: " Blue ",
  creator: " Joni Mitchell ",
  year: "1971",
  date: "2026-10-05",
  status: "experienced",
  reaction: "liked",
  toExplore: false,
  tags: [" folk ", "quiet", "Folk", ""],
  notes: "A first listen, saved privately.",
};

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: vi.fn((_key: string) => value),
    setItem: vi.fn((_key: string, next: string) => {
      value = next;
    }),
  };
}

afterEach(() => vi.useRealTimers());

describe("add and retrieve a journal entry", () => {
  it.each(["artwork", "song", "album", "movie"] as const)(
    "round-trips a %s with separate work and reaction data",
    (type) => {
      const storage = memoryStorage();
      const original = readJournal(storage);
      const result = addEntry(original, { ...input, type });
      writeJournal(result.journal, storage);
      const restored = readJournal(storage);

      expect(restored).toEqual(result.journal);
      expect(restored.works[0]).toMatchObject({
        title: "Blue",
        creator: "Joni Mitchell",
        type,
      });
      expect(restored.works[0]).not.toHaveProperty("reaction");
      expect(restored.entries[0]).toMatchObject({
        workId: result.work.id,
        reaction: "liked",
        tags: ["folk", "quiet"],
      });
      expect(restored.entries[0]).not.toHaveProperty("title");
      expect(storage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String),
      );
      expect(original).toEqual({ version: 1, works: [], entries: [] });
    },
  );

  it("adds a later reaction to an existing work without duplicating or changing its metadata", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const second = addEntry(
      first.journal,
      {
        ...input,
        title: "Ignored edit",
        date: "2026-10-06",
        reaction: "mixed",
      },
      first.work.id,
    );
    expect(second.journal.works).toEqual([first.work]);
    expect(second.journal.entries).toHaveLength(2);
    expect(second.entry.workId).toBe(first.work.id);
    expect(first.journal.entries).toHaveLength(1);
    expect(second.entry.tags).not.toBe(input.tags);
  });

  it("returns fresh empty data and protects the shared empty template", () => {
    const storage = memoryStorage();
    const first = readJournal(storage);
    first.works.push(addEntry(EMPTY_JOURNAL, input).work);
    expect(readJournal(storage)).toEqual({
      version: 1,
      works: [],
      entries: [],
    });
    expect(EMPTY_JOURNAL.works).toHaveLength(0);
    expect(Object.isFrozen(EMPTY_JOURNAL)).toBe(true);
    expect(Object.isFrozen(EMPTY_JOURNAL.entries)).toBe(true);
  });
});

describe("entry validation", () => {
  it.each([
    { title: "  " },
    { creator: 9 },
    { type: "book" },
    { date: "2026-02-30" },
    { date: "2025-02-29" },
    { date: "10/05/2026" },
    { year: "999" },
    { year: "3000" },
    { status: "saved", reaction: "liked" },
    { reaction: "love" },
    { tags: [7] },
  ])("rejects invalid input %j", (change) => {
    expect(() =>
      addEntry(EMPTY_JOURNAL, { ...input, ...change } as EntryInput),
    ).toThrow();
    expect(EMPTY_JOURNAL.entries).toHaveLength(0);
  });

  it("accepts leap dates, no creator or year, and an optional reaction", () => {
    const result = addEntry(EMPTY_JOURNAL, {
      ...input,
      creator: "",
      date: "2024-02-29",
      year: "",
      reaction: null,
    });
    expect(result.entry.reaction).toBeNull();
    expect(result.work.creator).toBe("");
  });

  it("does not invent an existing work when its id is missing", () => {
    expect(() => addEntry(EMPTY_JOURNAL, input, "missing")).toThrow(
      "could not be found",
    );
  });
});

describe("dated preference state", () => {
  it("keeps saved, experienced, and liked distinct while allowing exploration", () => {
    const saved = addEntry(EMPTY_JOURNAL, {
      ...input,
      status: "saved",
      reaction: null,
      toExplore: true,
    });
    expect(workState(saved.journal, saved.work.id)).toEqual({
      saved: true,
      experienced: false,
      liked: false,
      toExplore: true,
    });
    const experienced = addEntry(
      saved.journal,
      { ...input, date: "2026-10-06", reaction: null },
      saved.work.id,
    );
    expect(workState(experienced.journal, saved.work.id)).toEqual({
      saved: false,
      experienced: true,
      liked: false,
      toExplore: false,
    });
    const liked = addEntry(
      experienced.journal,
      { ...input, date: "2026-10-07" },
      saved.work.id,
    );
    expect(workState(liked.journal, saved.work.id).liked).toBe(true);
  });

  it("uses experience date rather than insertion order when tastes change", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const later = addEntry(
      first.journal,
      { ...input, date: "2026-10-08", reaction: "not_for_me" },
      first.work.id,
    );
    const backdated = addEntry(
      later.journal,
      { ...input, date: "2026-09-01", reaction: "liked" },
      first.work.id,
    );
    expect(latestEntry(backdated.journal, first.work.id)?.id).toBe(
      later.entry.id,
    );
    expect(
      latestExperiencedEntry(backdated.journal, first.work.id)?.reaction,
    ).toBe("not_for_me");
    expect(workState(backdated.journal, first.work.id).liked).toBe(false);
    expect(backdated.journal.entries.map((entry) => entry.id)).toEqual([
      first.entry.id,
      later.entry.id,
      backdated.entry.id,
    ]);
  });

  it("keeps the last experienced reaction when a later saved entry is recorded", () => {
    const experienced = addEntry(EMPTY_JOURNAL, input);
    const saved = addEntry(
      experienced.journal,
      {
        ...input,
        date: "2026-10-08",
        status: "saved",
        reaction: null,
        toExplore: true,
      },
      experienced.work.id,
    );
    expect(workState(saved.journal, experienced.work.id)).toEqual({
      saved: false,
      experienced: true,
      liked: true,
      toExplore: true,
    });
  });

  it("breaks same-date ties by creation time, then id", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const base = first.entry;
    const journal: Journal = {
      ...first.journal,
      entries: [
        { ...base, id: "a", createdAt: "2026-10-05T10:00:00.000Z" },
        { ...base, id: "b", createdAt: "2026-10-05T12:00:00.000Z" },
        { ...base, id: "c", createdAt: "2026-10-05T12:00:00.000Z" },
      ],
    };
    expect(latestEntry(journal, first.work.id)?.id).toBe("c");
    expect(workState(journal, "missing")).toEqual({
      saved: false,
      experienced: false,
      liked: false,
      toExplore: false,
    });
  });
});

describe("storage failure and corruption", () => {
  it.each(["not json", '{"version":2,"works":[],"entries":[]}', "null", "{}"])(
    "preserves unreadable stored data: %s",
    (raw) => {
      const storage = memoryStorage(raw);
      expect(() => readJournal(storage)).toThrow("preserved");
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it.each([
    "missing-work",
    "duplicate-work",
    "invalid-date",
    "invalid-reaction",
    "duplicate-entry",
    "invalid-timestamp",
  ])("rejects corrupt schema: %s", (kind) => {
    const { journal } = addEntry(EMPTY_JOURNAL, input);
    const broken = structuredClone(journal);
    if (kind === "missing-work") broken.entries[0].workId = "unknown";
    if (kind === "duplicate-work") broken.works.push({ ...broken.works[0] });
    if (kind === "invalid-date") broken.entries[0].date = "2026-02-31";
    if (kind === "invalid-reaction") broken.entries[0].status = "saved";
    if (kind === "duplicate-entry")
      broken.entries.push({ ...broken.entries[0] });
    if (kind === "invalid-timestamp")
      broken.works[0].createdAt = "2026-02-30T00:00:00.000Z";
    const storage = memoryStorage(JSON.stringify(broken));
    expect(() => readJournal(storage)).toThrow("preserved");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("reports blocked reads and writes and leaves previous data intact", () => {
    const { journal } = addEntry(EMPTY_JOURNAL, input);
    const storage = memoryStorage("previous data");
    storage.setItem.mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => writeJournal(journal, storage)).toThrow("could not save");
    expect(storage.getItem(STORAGE_KEY)).toBe("previous data");
    storage.getItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => readJournal(storage)).toThrow("could not read");
  });
});

describe("editing and deleting dated entries", () => {
  it("edits shared work information and only the selected personal entry, preserving identifiers and history", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const second = addEntry(
      first.journal,
      {
        ...input,
        date: "2026-10-08",
        reaction: "mixed",
        notes: "Second listen.",
      },
      first.work.id,
    );
    const before = structuredClone(second.journal);
    const edited = editEntry(second.journal, first.entry.id, {
      ...input,
      title: "Blue (corrected title)",
      creator: "Joni Mitchell",
      year: "1972",
      notes: "A revised note.",
      tags: [" favorite ", "Favorite"],
      reaction: "not_for_me",
    });

    expect(second.journal).toEqual(before);
    expect(edited.works).toHaveLength(1);
    expect(edited.works[0]).toEqual({
      ...first.work,
      title: "Blue (corrected title)",
      year: "1972",
    });
    expect(edited.entries[0]).toEqual({
      ...first.entry,
      reaction: "not_for_me",
      notes: "A revised note.",
      tags: ["favorite"],
    });
    expect(edited.entries[1]).toEqual(second.entry);
    expect(edited.entries[1]).toBe(second.entry);
    expect(edited.entries[0]).not.toHaveProperty("title");
    expect(edited.works[0]).not.toHaveProperty("reaction");
    expect(latestExperiencedEntry(edited, first.work.id)).toBe(second.entry);
  });

  it("updates current preference and explore state from an edited date and reaction without changing another work", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const second = addEntry(
      first.journal,
      { ...input, date: "2026-10-08", reaction: "mixed" },
      first.work.id,
    );
    const other = addEntry(second.journal, {
      ...input,
      type: "movie",
      title: "Other work",
    });
    const edited = editEntry(other.journal, first.entry.id, {
      ...input,
      date: "2026-10-09",
      reaction: "liked",
      toExplore: true,
    });
    expect(workState(edited, first.work.id)).toEqual({
      saved: false,
      experienced: true,
      liked: true,
      toExplore: true,
    });
    expect(edited.works[1]).toBe(other.work);
    expect(edited.entries[2]).toBe(other.entry);
  });

  it("supports editing the only experience to saved without inventing a reaction", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const edited = editEntry(first.journal, first.entry.id, {
      ...input,
      status: "saved",
      reaction: null,
      toExplore: true,
    });
    expect(workState(edited, first.work.id)).toEqual({
      saved: true,
      experienced: false,
      liked: false,
      toExplore: true,
    });
  });

  it("validates edits before changing the original journal", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const before = structuredClone(first.journal);
    expect(() =>
      editEntry(first.journal, first.entry.id, { ...input, title: "" }),
    ).toThrow("title");
    expect(() =>
      editEntry(first.journal, first.entry.id, { ...input, status: "saved" }),
    ).toThrow("before recording a reaction");
    expect(first.journal).toEqual(before);
  });

  it("deletes one history entry while retaining the work and revealing the earlier preference", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const second = addEntry(
      first.journal,
      { ...input, date: "2026-10-08", reaction: "mixed" },
      first.work.id,
    );
    const before = structuredClone(second.journal);
    const deleted = deleteEntry(second.journal, second.entry.id);
    expect(deleted.works).toEqual([first.work]);
    expect(deleted.entries).toEqual([first.entry]);
    expect(workState(deleted, first.work.id).liked).toBe(true);
    expect(second.journal).toEqual(before);
  });

  it("cleans up only the affected work when its final entry is deleted", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const other = addEntry(first.journal, {
      ...input,
      type: "artwork",
      title: "Other work",
    });
    const deleted = deleteEntry(other.journal, first.entry.id);
    expect(deleted.works).toEqual([other.work]);
    expect(deleted.entries).toEqual([other.entry]);
    const empty = deleteEntry(deleted, other.entry.id);
    expect(empty).toEqual({ version: 1, works: [], entries: [] });
  });

  it("deletes a whole work with its complete history while preserving another work", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const second = addEntry(
      first.journal,
      { ...input, date: "2026-10-08", reaction: "mixed" },
      first.work.id,
    );
    const other = addEntry(second.journal, {
      ...input,
      type: "song",
      title: "Other work",
    });
    const before = structuredClone(other.journal);
    const deleted = deleteWork(other.journal, first.work.id);
    expect(deleted.works).toEqual([other.work]);
    expect(deleted.entries).toEqual([other.entry]);
    expect(other.journal).toEqual(before);
  });

  it("persists and retrieves an edited or deleted journal using the original format", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const edited = editEntry(first.journal, first.entry.id, {
      ...input,
      title: "Edited title",
      reaction: null,
    });
    const storage = memoryStorage();
    writeJournal(edited, storage);
    expect(readJournal(storage)).toEqual(edited);
    const deleted = deleteEntry(edited, first.entry.id);
    writeJournal(deleted, storage);
    expect(readJournal(storage)).toEqual({
      version: 1,
      works: [],
      entries: [],
    });
  });

  it("reports missing ids without removing or editing other data", () => {
    const first = addEntry(EMPTY_JOURNAL, input);
    const before = structuredClone(first.journal);
    expect(() => editEntry(first.journal, "missing", input)).toThrow(
      "entry could not be found",
    );
    expect(() => deleteEntry(first.journal, "missing")).toThrow(
      "entry could not be found",
    );
    expect(() => deleteWork(first.journal, "missing")).toThrow(
      "work could not be found",
    );
    expect(first.journal).toEqual(before);
  });
});

it("uses the local calendar date for a new entry", () => {
  vi.useFakeTimers();
  const date = new Date(2026, 9, 5, 23, 30);
  vi.setSystemTime(date);
  expect(todayDate()).toBe("2026-10-05");
});
