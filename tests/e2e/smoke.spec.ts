import { expect, test, type Page } from "@playwright/test";

type ExpectedText = string | string[];
type Credentials = { email?: string; password?: string };

const requireAuthenticatedSmoke = process.env.E2E_REQUIRE_AUTH === "1";

const publicRoutes = [
  { path: "/", expected: "Smart Water Monitoring" },
  { path: "/login", expected: "Sign in" },
  { path: "/signup", expected: "Create account" },
  { path: "/forgot-password", expected: "Reset password" },
  { path: "/reset-password", expected: "Set a new password" },
  { path: "/verify-otp", expected: "Verify your email" },
  { path: "/activate-account", expected: "Create your account" },
];

const protectedRoutes = [
  "/app/dashboard",
  "/app/live",
  "/app/farms",
  "/app/devices",
  "/app/setup",
  "/app/maintenance",
  "/app/alerts",
  "/app/reports",
  "/app/settings",
  "/admin/dashboard",
  "/admin/farms",
  "/admin/devices",
  "/admin/users",
  "/admin/alerts",
  "/admin/support",
  "/admin/settings",
];

const authenticatedAppRoutes = [
  { path: "/app/dashboard", expected: ["Farm overview", "Add your first pond"] },
  { path: "/app/devices", expected: "Devices" },
  { path: "/app/settings", expected: "Settings" },
];

const authenticatedAdminRoutes = [
  { path: "/admin/dashboard", expected: "Platform overview" },
  { path: "/admin/support", expected: "Support Tickets" },
  { path: "/admin/settings", expected: "Platform Configuration" },
];

async function expectUsablePage(page: Page, expected: ExpectedText) {
  const expectedTexts = Array.isArray(expected) ? expected : [expected];
  await expect
    .poll(async () => {
      const text = await page.locator("body").innerText();
      return expectedTexts.some((value) => text.includes(value));
    })
    .toBe(true);
  await expect(page.locator("body")).not.toContainText("This page didn't load");
  await expect(page.locator("body")).not.toContainText("Something went wrong on our end");
  await expect(page.locator("body")).not.toContainText("Application Error");

  const state = await page.evaluate(() => {
    const text = document.body?.innerText?.trim() ?? "";
    const overflowX =
      Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) -
      document.documentElement.clientWidth;

    return {
      hasMeaningfulContent: text.length > 80,
      overflowX,
    };
  });

  expect(state.hasMeaningfulContent).toBe(true);
  expect(state.overflowX).toBeLessThanOrEqual(1);
}

function routeUrlPattern(path: string) {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#].*)?$`);
}

async function signIn(page: Page, credentials?: Credentials, label = "app") {
  const email = credentials?.email ?? process.env.E2E_EMAIL;
  const password = credentials?.password ?? process.env.E2E_PASSWORD;
  if (!email || !password) {
    const message =
      label === "admin"
        ? "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD, or create .env.e2e.local, to run admin smoke tests."
        : "Set E2E_EMAIL and E2E_PASSWORD, or create .env.e2e.local, to run authenticated smoke tests.";

    if (requireAuthenticatedSmoke) throw new Error(message);
    test.skip(true, message);
  }

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test.describe("public route smoke", () => {
  for (const route of publicRoutes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expectUsablePage(page, route.expected);
    });
  }
});

test.describe("protected route guard smoke", () => {
  for (const path of protectedRoutes) {
    test(`redirects unauthenticated users from ${path}`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login/);
      const url = new URL(page.url());
      expect(url.searchParams.get("redirect")).toBe(path);
      await expectUsablePage(page, "Sign in");
    });
  }
});

test.describe("authenticated app smoke", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  for (const route of authenticatedAppRoutes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(routeUrlPattern(route.path));
      await expectUsablePage(page, route.expected);
    });
  }
});

test.describe("authenticated admin smoke", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(
      page,
      {
        email: process.env.E2E_ADMIN_EMAIL,
        password: process.env.E2E_ADMIN_PASSWORD,
      },
      "admin",
    );
  });

  for (const route of authenticatedAdminRoutes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(routeUrlPattern(route.path));
      await expectUsablePage(page, route.expected);
    });
  }
});
