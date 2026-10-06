import { describe, expect, it } from "vitest";
import { createBackup, parseBackup } from "./backup";
import { addEntry, EMPTY_JOURNAL } from "./journal";
import { SAMPLE_JOURNAL } from "./samples";

const personal = addEntry(EMPTY_JOURNAL, {
  type: "movie",
  title: "A first watch",
  creator: "",
  year: "2024",
  date: "2026-09-01",
  status: "experienced",
  reaction: "liked",
  toExplore: true,
  tags: ["quiet"],
  notes: "Keep this feeling.",
}).journal;

describe("personal journal backups", () => {
  it("round-trips metadata, dated reactions, IDs, tags and notes without mutation", () => {
    const before = JSON.stringify(personal);
    const result = parseBackup(createBackup(personal));
    expect(result).toEqual(personal);
    expect(JSON.stringify(personal)).toBe(before);
    expect(result).not.toBe(personal);
    expect(result.entries[0]).not.toBe(personal.entries[0]);
  });
  it("exports personal entries without introducing sample fixtures", () => {
    const result = parseBackup(createBackup(personal));
    expect(result.works).toHaveLength(1);
    expect(
      result.works.some((work) =>
        SAMPLE_JOURNAL.works.some((sample) => sample.id === work.id),
      ),
    ).toBe(false);
  });
  it("supports an empty backup without inventing entries", () => {
    expect(parseBackup(createBackup(EMPTY_JOURNAL))).toEqual(EMPTY_JOURNAL);
  });
  it.each([
    "{broken",
    "null",
    "{}",
    '{"format":"other-app"}',
    '{"format":"still-journal-backup","backupVersion":2,"journal":{}}',
  ])("rejects unsupported file %s", (text) => {
    expect(() => parseBackup(text)).toThrow();
  });
  it("rejects an oversized file", () => {
    expect(() => parseBackup(" ".repeat(10 * 1024 * 1024 + 1))).toThrow(
      "smaller than 10 MB",
    );
  });
  it("does not create a backup that would exceed its own restore limit", () => {
    const tooLarge = structuredClone(personal);
    tooLarge.entries[0].notes = "x".repeat(10 * 1024 * 1024);
    expect(() => createBackup(tooLarge)).toThrow("10 MB backup limit");
  });
  it.each([
    "missing-work",
    "duplicate-entry",
    "saved-reaction",
    "invalid-date",
  ])("rejects %s rather than partially importing", (defect) => {
    const envelope = JSON.parse(createBackup(personal));
    const entry = envelope.journal.entries[0];
    if (defect === "missing-work") entry.workId = "missing";
    if (defect === "duplicate-entry") envelope.journal.entries.push(entry);
    if (defect === "saved-reaction") entry.status = "saved";
    if (defect === "invalid-date") entry.date = "2026-02-30";
    expect(() => parseBackup(JSON.stringify(envelope))).toThrow(
      "invalid or incomplete entries",
    );
  });
});
