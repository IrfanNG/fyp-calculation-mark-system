import { test, expect } from "@playwright/test";

async function loginAs(page: any, staffId: string, password: string) {
  await page.goto("/login", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.locator("label:has-text('Staff ID')").locator("..").locator("input").fill(staffId);
  await page.locator("label:has-text('Password')").locator("..").locator("input").fill(password);
  await page.click("button[type='submit']");
  await page.waitForTimeout(2000);
}

async function studentLogin(page: any, id: string, pw: string) {
  await page.goto("/student/login", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.locator("label:has-text('Student ID')").locator("..").locator("input").fill(id);
  await page.locator("label:has-text('Password')").locator("..").locator("input").fill(pw);
  await page.click("button[type='submit']");
  await page.waitForTimeout(2000);
}

// ── A. Public / Auth Flow ──────────────────────────────────
test.describe("A. Public / Auth Flow", () => {
  test("A1. Welcome page", async ({ page }) => {
    await page.goto("/welcome", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("A2. Lecturer login page", async ({ page }) => {
    await page.goto("/login", { waitUntil: "load" });
    await expect(page.locator("label:has-text('Staff ID')")).toBeVisible();
  });

  test("A3. Student login page", async ({ page }) => {
    await page.goto("/student/login", { waitUntil: "load" });
    await expect(page.locator("label:has-text('Student ID')")).toBeVisible();
  });
});

// ── B. Coordinator / Admin Flow ────────────────────────────
test.describe("B. Coordinator/Admin Flow", () => {
  test("B1. Dashboard loads after login", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator("h1")).toContainText("Coordinator Dashboard");
  });

  test("B2. Dashboard has FYP1/FYP2/Final Mark columns", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator("th:has-text('FYP1 Mark')")).toBeVisible();
    await expect(page.locator("th:has-text('FYP2 Mark')")).toBeVisible();
    await expect(page.locator("th:has-text('Final Mark')")).toBeVisible();
  });

  test("B3. Dashboard shows unassigned students", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator("text=Not assigned yet").first()).toBeVisible({ timeout: 5000 });
  });

  test("B4. All Projects page loads", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/coordinator/projects", { waitUntil: "load" });
    await expect(page.locator("h1")).toContainText("All FYP Projects");
  });

  test("B5. All Projects shows unassigned", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/coordinator/projects", { waitUntil: "load" });
    await expect(page.locator("text=Not assigned yet").first()).toBeVisible({ timeout: 5000 });
  });

  test("B6. Assign assessor page", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/coordinator/assign", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("B7. Grade Scale page", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/coordinator/gpa-scale", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("B8. Final Marks page", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/coordinator/marks", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });
});

// ── C. Supervisor Flow ─────────────────────────────────────
test.describe("C. Supervisor Flow", () => {
  test("C1. My Students page", async ({ page }) => {
    await loginAs(page, "444444", "444444");
    await page.goto("/supervisor/projects", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("C2. Open project detail", async ({ page }) => {
    await loginAs(page, "444444", "444444");
    await page.goto("/supervisor/projects", { waitUntil: "load" });
    const link = page.locator("a[href*='/supervisor/projects/']").first();
    await expect(link).toBeVisible({ timeout: 5000 });
    await link.click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("C3. Submitted Documents section", async ({ page }) => {
    await loginAs(page, "444444", "444444");
    await page.goto("/supervisor/projects", { waitUntil: "load" });
    await page.locator("a[href*='/supervisor/projects/']").first().click();
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Submitted Documents").first()).toBeVisible({ timeout: 5000 });
  });

  test("C4. Rubric links visible", async ({ page }) => {
    await loginAs(page, "444444", "444444");
    await page.goto("/supervisor/projects", { waitUntil: "load" });
    await page.locator("a[href*='/supervisor/projects/']").first().click();
    await page.waitForTimeout(2000);
    await expect(page.locator("a:has-text('Presentation Rubric')").first()).toBeVisible({ timeout: 5000 });
  });

  test("C5. Supervisor Mark section", async ({ page }) => {
    await loginAs(page, "444444", "444444");
    await page.goto("/supervisor/projects", { waitUntil: "load" });
    await page.locator("a[href*='/supervisor/projects/']").first().click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h2:has-text('Supervisor Mark')")).toBeVisible({ timeout: 5000 });
  });
});

// ── D. Assessor Flow ───────────────────────────────────────
test.describe("D. Assessor Flow", () => {
  test("D1. Assigned Students page", async ({ page }) => {
    await loginAs(page, "555555", "555555");
    await page.goto("/assessor/projects", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("D2. Open project detail", async ({ page }) => {
    await loginAs(page, "555555", "555555");
    await page.goto("/assessor/projects", { waitUntil: "load" });
    const link = page.locator("a[href*='/assessor/projects/']").first();
    await expect(link).toBeVisible({ timeout: 5000 });
    await link.click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("D3. Rubric links visible", async ({ page }) => {
    await loginAs(page, "555555", "555555");
    await page.goto("/assessor/projects", { waitUntil: "load" });
    await page.locator("a[href*='/assessor/projects/']").first().click();
    await page.waitForTimeout(2000);
    await expect(page.locator("a:has-text('Presentation Rubric')").first()).toBeVisible({ timeout: 5000 });
  });

  test("D4. Evaluate section", async ({ page }) => {
    await loginAs(page, "555555", "555555");
    await page.goto("/assessor/projects", { waitUntil: "load" });
    await page.locator("a[href*='/assessor/projects/']").first().click();
    await page.waitForTimeout(2000);
    await expect(page.locator("h2:has-text('Evaluate')")).toBeVisible({ timeout: 5000 });
  });
});

// ── E. Student Flow ────────────────────────────────────────
test.describe("E. Student Flow", () => {
  test("E1. Student dashboard", async ({ page }) => {
    await studentLogin(page, "7777777", "7777777");
    await page.goto("/student/fyp", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("E2. Student feedback page", async ({ page }) => {
    await studentLogin(page, "7777777", "7777777");
    await page.goto("/student/fyp/feedback", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("E3. Student results page", async ({ page }) => {
    await studentLogin(page, "7777777", "7777777");
    await page.goto("/student/fyp/results", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("E4. Student blocked from coordinator", async ({ page }) => {
    await studentLogin(page, "7777777", "7777777");
    await page.goto("/coordinator/projects", { waitUntil: "load" });
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain("/coordinator/projects");
  });

  test("E5. FYP2 student", async ({ page }) => {
    await studentLogin(page, "00000", "00000");
    await page.goto("/student/fyp", { waitUntil: "load" });
    await expect(page.locator("body")).toBeVisible();
  });
});

// ── F. Security / Access Control ───────────────────────────
test.describe("F. Security/Access Control", () => {
  test("F1. Security headers", async ({ request }) => {
    const res = await request.get("/welcome");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["referrer-policy"]).toBe("no-referrer");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });

  test("F2. TRACE rejected", async ({ request }) => {
    const res = await request.fetch("/", { method: "TRACE" });
    expect([405, 500]).toContain(res.status());
  });

  test("F3. External next= blocked", async ({ page }) => {
    await page.goto("/login?next=https://evil.com", { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.locator("label:has-text('Staff ID')").locator("..").locator("input").fill("ADMIN001");
    await page.locator("label:has-text('Password')").locator("..").locator("input").fill("admin123");
    await page.click("button[type='submit']");
    await page.waitForTimeout(2000);
    expect(page.url()).toBe("http://localhost:3000/");
  });

  test("F4. Unauthenticated redirected", async ({ page }) => {
    await page.goto("/coordinator/projects", { waitUntil: "load" });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/login");
  });
});

// ── G. Regression Checks ───────────────────────────────────
test.describe("G. Regression Checks", () => {
  test("G1. Coordinator dashboard no errors", async ({ page }) => {
    await loginAs(page, "ADMIN001", "admin123");
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator("text=Something went wrong")).toHaveCount(0);
    await expect(page.locator("text=Objects are not valid")).toHaveCount(0);
  });
});
