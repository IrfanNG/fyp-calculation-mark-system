import { test, expect } from "@playwright/test";

const ADMIN = { staffId: "ADMIN001", password: "admin123" };

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("input[placeholder*='LEC']", ADMIN.staffId);
  await page.fill("input[type='password']", ADMIN.password);
  await page.click("button[type='submit']");
  await page.waitForURL("**/");
}

test.describe("Nikto Mitigation Verification", () => {
  test("1. Security headers are present", async ({ request }) => {
    // /welcome is a 200 page (root / redirects, so test there)
    const res = await request.get("/welcome");
    const headers = res.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("microphone=()");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    expect(headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("2. TRACE method is rejected", async ({ request }) => {
    // Next.js framework rejects TRACE before middleware runs,
    // returning 500. In production, Nginx/Apache should block TRACE.
    const res = await request.fetch("/", { method: "TRACE" });
    expect([405, 500]).toContain(res.status());
  });

  test("3. External next= redirect is blocked", async ({ page }) => {
    await page.goto(`/login?next=https://evil.com`);
    await page.fill("input[placeholder*='LEC']", ADMIN.staffId);
    await page.fill("input[type='password']", ADMIN.password);
    await page.click("button[type='submit']");
    await page.waitForURL("**/");
    expect(page.url()).not.toContain("evil.com");
    expect(page.url()).toBe("http://localhost:3000/");
  });

  test("4. //evil.com next= redirect is blocked", async ({ page }) => {
    await page.goto(`/login?next=//evil.com`);
    await page.fill("input[placeholder*='LEC']", ADMIN.staffId);
    await page.fill("input[type='password']", ADMIN.password);
    await page.click("button[type='submit']");
    await page.waitForURL("**/");
    expect(page.url()).toBe("http://localhost:3000/");
  });

  test("5. Internal next= redirect works", async ({ page }) => {
    await page.goto(`/login?next=/coordinator/projects`);
    await page.fill("input[placeholder*='LEC']", ADMIN.staffId);
    await page.fill("input[type='password']", ADMIN.password);
    await page.click("button[type='submit']");
    await page.waitForURL("**/coordinator/projects");
    expect(page.url()).toContain("/coordinator/projects");
  });

  test("6. Smoke test: protected pages load", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Coordinator Dashboard");

    await page.goto("/coordinator/projects", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("All FYP Projects");

    await page.goto("/coordinator/marks", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Final Marks");
  });
});
