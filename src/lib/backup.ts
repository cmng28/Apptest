import { validateJournal } from "./journal";
import type { Journal } from "./journal";

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

export function createBackup(journal: Journal): string {
  const text = JSON.stringify(
    {
      format: "still-journal-backup",
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      journal: validateJournal(journal),
    },
    null,
    2,
  );
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    throw new Error(
      "Your journal is larger than the 10 MB backup limit. Your entries are unchanged.",
    );
  }
  return text;
}

export function parseBackup(text: string): Journal {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    throw new Error("Choose a Still backup smaller than 10 MB.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "This file is not readable JSON. Choose a Still backup file.",
    );
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("format" in value) ||
    value.format !== "still-journal-backup" ||
    !("backupVersion" in value) ||
    value.backupVersion !== 1 ||
    !("journal" in value)
  ) {
    throw new Error(
      "This is not a supported Still backup. Your journal has not changed.",
    );
  }
  try {
    return validateJournal(value.journal);
  } catch {
    throw new Error(
      "This backup contains invalid or incomplete entries. Your journal has not changed.",
    );
  }
}
