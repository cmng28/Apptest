import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
test.use({ timezoneId: "America/Los_Angeles" });

async function addPersonal(page: import("@playwright/test").Page) {
  await page.goto("/#/add");
  await page.getByLabel(/^Title/).fill("A phone-sized memory");
  await page.getByLabel(/^Notes/).fill("A note worth keeping.");
  await page.getByLabel(/^Reaction/).selectOption("liked");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A phone-sized memory", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem("still-journal-v1"),
  );
  await page.goto("/#/taste");
  return saved;
}

test("exports personal data in sample mode and restores only after confirmation", async ({
  page,
}) => {
  const original = await addPersonal(page);
  await page.clock.setFixedTime(new Date("2026-10-06T03:00:00Z"));
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  await page
    .getByRole("button", { name: "Sample library", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save backup", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Still-backup-2026-10-05.json");
  const text = await readFile((await download.path())!, "utf8");
  const backup = JSON.parse(text);
  expect(backup.journal).toEqual(JSON.parse(original!));
  expect(backup.journal.works).toHaveLength(1);

  const replacement = structuredClone(backup);
  replacement.journal.works[0].title = "Restored phone journal";
  const input = page.getByLabel("Choose a Still backup", { exact: true });
  const file = {
    name: "Still-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(replacement)),
  };
  await input.setInputFiles(file);
  const dialog = page.getByRole("dialog", {
    name: "Restore this backup?",
    exact: true,
  });
  await expect(dialog).toContainText("replace your current");
  await dialog
    .getByRole("button", { name: "Keep current journal", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("still-journal-v1")),
  ).toBe(original);
  await input.setInputFiles(file);
  await dialog
    .getByRole("button", { name: "Replace with backup", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/library$/);
  await page.getByRole("link", { name: /Restored phone journal/ }).click();
  await expect(
    page.getByText("A note worth keeping.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Restored phone journal", exact: true }),
  ).toBeVisible();
});

test("invalid backups and failed restore writes leave existing entries intact", async ({
  page,
}) => {
  const original = await addPersonal(page);
  const input = page.getByLabel("Choose a Still backup", { exact: true });
  await input.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.getByRole("alert")).toContainText("not readable JSON");
  expect(
    await page.evaluate(() => localStorage.getItem("still-journal-v1")),
  ).toBe(original);
  const envelope = {
    format: "still-journal-backup",
    backupVersion: 1,
    journal: JSON.parse(original!),
  };
  envelope.journal.works[0].title = "Should not replace my journal";
  await input.setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(envelope)),
  });
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "still-journal-v1")
        throw new DOMException("Quota exhausted", "QuotaExceededError");
      set.call(this, key, value);
    };
  });
  const dialog = page.getByRole("dialog", {
    name: "Restore this backup?",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Replace with backup", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("could not save");
  expect(
    await page.evaluate(() => localStorage.getItem("still-journal-v1")),
  ).toBe(original);
  await expect(dialog).toBeVisible();
});

test("uses file sharing when available and handles cancellation honestly", async ({
  page,
}) => {
  const original = await addPersonal(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        const file = data.files![0];
        sessionStorage.setItem("test-shared-backup", await file.text());
      },
    });
  });
  await page.getByRole("button", { name: "Save backup", exact: true }).click();
  await expect(page.getByText(/Backup shared\. Keep a copy/)).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("test-shared-backup")!).journal,
    ),
  ).toEqual(JSON.parse(original!));
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    }),
  );
  await page.getByRole("button", { name: "Save backup", exact: true }).click();
  await expect(page.getByText(/Backup sharing cancelled/)).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("still-journal-v1")),
  ).toBe(original);
});
