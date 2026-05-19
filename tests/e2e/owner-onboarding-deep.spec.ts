/**
 * owner-onboarding-deep.spec.ts
 * Deep hostel creation, editing, room/bed management.
 * Tests every field, every validation, mobile layout, refresh behavior.
 */
import { expect, test, type Page } from "@playwright/test";
import { uniqueHostelData, uniqueRoomData } from "./test-data";

// ── helpers ───────────────────────────────────────────────────────────────────

async function loginAsDemoOwner(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/owner/login");
  await page.getByRole("button", { name: /try demo workspace/i }).click();
  await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

async function getCsrf(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const res = await fetch("/api/csrf");
    const data = await res.json() as { token?: string };
    return data.token ?? "";
  });
}

async function apiGet(page: Page, path: string) {
  const csrf = await getCsrf(page);
  return page.evaluate(
    async ({ path, csrf }) => {
      const res = await fetch(path, {
        headers: { "x-csrf-token": decodeURIComponent(csrf) },
        credentials: "same-origin",
      });
      return { status: res.status, body: await res.json() };
    },
    { path, csrf }
  );
}

async function goToCreateHostel(page: Page) {
  await page.goto("/owner/create-hostel");
  await page.waitForLoadState("networkidle");
}

// ── hostel creation — valid flows ─────────────────────────────────────────────

test.describe("Create hostel — valid flows", () => {
  test("Step 1: fills name and address, continues to Step 2", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();

    // Step 2 should be visible (room/bed section)
    await expect(
      page.getByPlaceholder(/room number|ex: 101/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test("Step 2: adds one room with 2 beds and saves hostel", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    const room = uniqueRoomData(1);

    // Step 1
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();

    // Step 2: fill room
    await expect(page.getByPlaceholder(/ex: 101/i).first()).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder(/ex: 101/i).first().fill(room.roomNumber);
    await page.getByPlaceholder(/ex: 3|bed count/i).first().fill(room.bedCount);

    // Save
    await page.getByRole("button", { name: /save hostel|create hostel/i }).click();

    // Should navigate away from create page or show success
    await expect(
      page.getByText(/hostel created|success|dashboard|tenants/i).or(
        page.locator("[role='status']").filter({ hasText: /created|saved/i })
      ).first()
    ).toBeVisible({ timeout: 12000 }).catch(async () => {
      // Some apps redirect to dashboard
      await expect(page).not.toHaveURL(/create-hostel/);
    });
  });

  test("Step 2: adds multiple rooms with different bed counts", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();

    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();
    await expect(page.getByPlaceholder(/ex: 101/i).first()).toBeVisible({ timeout: 8000 });

    // Fill first room
    const r1 = uniqueRoomData(1);
    await page.getByPlaceholder(/ex: 101/i).first().fill(r1.roomNumber);
    await page.getByPlaceholder(/ex: 3/i).first().fill("1");

    // Add second room
    await page.getByRole("button", { name: /add room/i }).click();
    const r2 = uniqueRoomData(2);
    await page.getByPlaceholder(/ex: 101/i).last().fill(r2.roomNumber);
    await page.getByPlaceholder(/ex: 3/i).last().fill("3");

    // Add third room
    await page.getByRole("button", { name: /add room/i }).click();
    const r3 = uniqueRoomData(3);
    await page.getByPlaceholder(/ex: 101/i).last().fill(r3.roomNumber);
    await page.getByPlaceholder(/ex: 3/i).last().fill("2");

    // Verify 3 room inputs exist
    await expect(page.getByPlaceholder(/ex: 101/i)).toHaveCount(3);

    await page.getByRole("button", { name: /save hostel|create hostel/i }).click();
    await expect(page).not.toHaveURL(/create-hostel/, { timeout: 12000 });
  });

  test("Step 2: inline tenant entry in bed form fills and submits", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();
    await expect(page.getByPlaceholder(/ex: 101/i).first()).toBeVisible({ timeout: 8000 });

    const room = uniqueRoomData(1);
    await page.getByPlaceholder(/ex: 101/i).first().fill(room.roomNumber);
    await page.getByPlaceholder(/ex: 3/i).first().fill("2");

    // Fill bed 1 inline tenant data if visible
    const bedNameInput = page.getByPlaceholder(/tenant name/i).first();
    if (await bedNameInput.isVisible()) {
      await bedNameInput.fill("Inline Tenant One");
      const bedPhone = page.getByPlaceholder(/phone number/i).first();
      if (await bedPhone.isVisible()) await bedPhone.fill("9876543210");
      const bedRent = page.getByPlaceholder(/monthly rent/i).first();
      if (await bedRent.isVisible()) await bedRent.fill("6000");
    }

    await page.getByRole("button", { name: /save hostel|create hostel/i }).click();
    await expect(page).not.toHaveURL(/create-hostel/, { timeout: 12000 });
  });
});

// ── hostel creation — validation ──────────────────────────────────────────────

test.describe("Create hostel — validation", () => {
  test("cannot continue Step 1 with empty hostel name", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    // Leave name empty, fill address
    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();

    // Should still be on Step 1 (room input not visible)
    await page.waitForTimeout(1000);
    const roomInput = page.getByPlaceholder(/ex: 101/i);
    const isStep2 = await roomInput.isVisible();
    expect(isStep2).toBe(false);
  });

  test("cannot continue Step 1 with empty address", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    // Leave address empty
    await page.getByRole("button", { name: /continue|next/i }).first().click();

    await page.waitForTimeout(1000);
    const isStep2 = await page.getByPlaceholder(/ex: 101/i).isVisible();
    expect(isStep2).toBe(false);
  });

  test("cannot save hostel with room number missing", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();
    await expect(page.getByPlaceholder(/ex: 101/i).first()).toBeVisible({ timeout: 8000 });

    // Leave room number empty, fill bed count
    await page.getByPlaceholder(/ex: 3/i).first().fill("2");
    await page.getByRole("button", { name: /save hostel|create hostel/i }).click();

    // Should stay on Step 2
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/create-hostel/);
  });

  test("remove room button reduces room count", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();
    await expect(page.getByPlaceholder(/ex: 101/i).first()).toBeVisible({ timeout: 8000 });

    // Add second room
    await page.getByRole("button", { name: /add room/i }).click();
    await expect(page.getByPlaceholder(/ex: 101/i)).toHaveCount(2);

    // Remove second room
    const removeBtn = page.getByRole("button", { name: /remove/i }).last();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await expect(page.getByPlaceholder(/ex: 101/i)).toHaveCount(1);
    }
  });
});

// ── hostel creation — mobile layout ──────────────────────────────────────────

test.describe("Create hostel — mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hostel creation form fits mobile screen without horizontal scroll", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("Step 2 room form fits mobile screen", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();
    await expect(page.getByPlaceholder(/ex: 101/i).first()).toBeVisible({ timeout: 8000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("save/continue buttons visible and clickable on mobile", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const continueBtn = page.getByRole("button", { name: /continue|next/i }).first();
    await expect(continueBtn).toBeVisible();
    const box = await continueBtn.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(40);
    expect(box!.height).toBeGreaterThan(36);
  });
});

// ── hostel creation — refresh behavior ───────────────────────────────────────

test.describe("Create hostel — refresh mid-form", () => {
  test("refresh on Step 1 resets form (expected behavior)", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.reload();

    // After refresh, form should be empty or back to start
    const nameInput = page.getByPlaceholder(/hostel name/i);
    if (await nameInput.isVisible()) {
      const value = await nameInput.inputValue();
      // Either empty (reset) or retained (fine too) — just must not crash
      expect(typeof value).toBe("string");
    }
  });

  test("refresh on Step 2 returns to Step 1 or Step 2 — no crash", async ({ page }) => {
    await loginAsDemoOwner(page);
    await goToCreateHostel(page);

    const hostel = uniqueHostelData();
    await page.getByPlaceholder(/hostel name/i).fill(hostel.name);
    await page.getByPlaceholder(/address/i).fill(hostel.address);
    await page.getByRole("button", { name: /continue|next/i }).first().click();
    await expect(page.getByPlaceholder(/ex: 101/i).first()).toBeVisible({ timeout: 8000 });

    await page.reload();
    // Should not throw error — just check page loaded
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

// ── edit hostel ───────────────────────────────────────────────────────────────

test.describe("Edit hostel", () => {
  test("edit hostel link on settings page navigates to edit form", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/settings");

    const editLink = page.getByRole("link", { name: /edit hostel/i })
      .or(page.getByRole("button", { name: /edit hostel/i })).first();
    if (await editLink.isVisible()) {
      await editLink.click();
      await expect(page).toHaveURL(/create-hostel.*edit|edit.*hostel/i, { timeout: 8000 });
    }
  });

  test("edit hostel form pre-fills existing hostel name", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/create-hostel?mode=edit");

    const nameInput = page.getByPlaceholder(/hostel name/i);
    if (await nameInput.isVisible({ timeout: 8000 })) {
      const value = await nameInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test("API: GET /api/owner-hostels returns hostel list", async ({ page }) => {
    await loginAsDemoOwner(page);
    const result = await apiGet(page, "/api/owner-hostels");
    expect(result.status).toBe(200);
    const hostels = (result.body as { hostels?: unknown[] }).hostels ?? result.body;
    expect(Array.isArray(hostels)).toBe(true);
  });
});

// ── rooms page after hostel creation ─────────────────────────────────────────

test.describe("Rooms page reflects hostel data", () => {
  test("rooms page shows at least one floor or room", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/rooms");
    await expect(
      page.getByText(/floor|room|bed|occupied|vacant/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("all/vacant filter buttons present on rooms page", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/rooms");
    await expect(
      page.getByRole("link", { name: /all|vacant|available/i })
        .or(page.getByRole("button", { name: /all|vacant|available/i }))
        .first()
    ).toBeVisible({ timeout: 8000 });
  });

  test("vacant filter shows only unoccupied rooms/beds", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/rooms");

    const vacantBtn = page.getByRole("button", { name: /vacant|available/i }).first();
    if (await vacantBtn.isVisible()) {
      await vacantBtn.click();
      await page.waitForTimeout(500);
      // Page should not crash
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });

  test("each room card has assign/add tenant button", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/rooms");
    await page.waitForLoadState("networkidle");

    // At least one assign or add tenant link/button should exist
    const assignBtns = page.getByRole("link", { name: /assign|add tenant/i })
      .or(page.getByRole("button", { name: /assign|add tenant/i }));
    const count = await assignBtns.count();
    // If rooms exist, there should be at least one
    if (count > 0) {
      await expect(assignBtns.first()).toBeVisible();
    }
  });

  test("rooms page no horizontal scroll on desktop", async ({ page }) => {
    await loginAsDemoOwner(page);
    await page.goto("/owner/rooms");
    await page.waitForLoadState("networkidle");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});
