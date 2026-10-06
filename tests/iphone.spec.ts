import { expect, test } from "@playwright/test";

async function ready(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
    return registration.scope;
  });
}

test("loads the production app, Home Screen metadata and icons under the repository path", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: /My Library/, level: 1 }),
  ).toBeVisible();
  expect(await ready(page)).toBe("http://127.0.0.1:5175/Apptest/");
  expect(
    await page.locator('meta[name="viewport"]').getAttribute("content"),
  ).toContain("viewport-fit=cover");
  expect(
    await page
      .locator('meta[name="apple-mobile-web-app-capable"]')
      .getAttribute("content"),
  ).toBe("yes");
  const manifestResponse = await request.get("./manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("./#/library");
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(
      icon.sizes,
    );
  }
  const apple = await (await request.get("./apple-touch-icon.png")).body();
  expect(apple.readUInt32BE(16)).toBe(180);
  await page.goto("./#/taste");
  await expect(
    page.getByText("Ready for offline use on this browser.", { exact: true }),
  ).toBeVisible();
  const sizes = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.width);
  expect(errors).toEqual([]);
});

test("reopens a dated journal offline in a fresh tab and permits offline edits", async ({
  page,
  context,
}) => {
  await page.goto("./#/add");
  await ready(page);
  await page.getByLabel(/^Title/).fill("An iPhone journal moment");
  await page.getByLabel(/^Notes/).fill("Saved before going offline.");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  const itemUrl = page.url();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "An iPhone journal moment",
      exact: true,
    }),
  ).toBeVisible();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(itemUrl);
  await expect(
    reopened.getByText("Saved before going offline.", { exact: true }),
  ).toBeVisible();
  await reopened.getByRole("link", { name: "Edit entry", exact: true }).click();
  await reopened.getByLabel(/^Notes/).fill("Edited offline on my phone.");
  await reopened
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await reopened.reload();
  await expect(
    reopened.getByText("Edited offline on my phone.", { exact: true }),
  ).toBeVisible();
});
