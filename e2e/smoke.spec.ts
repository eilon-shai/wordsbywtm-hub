/**
 * Tier A — render/hydration SMOKE. SAFE: creates NO collections, writes NO DB rows.
 *
 * This layer boots the real app (mock dev server, port 3005) in a real browser
 * and asserts the app actually renders and hydrates — catching Next 15 build,
 * client-component, server-component, and Paddle.js wiring breakage that the
 * in-process vitest layer can't see.
 *
 * It deliberately stops short of submitting anything. The contributor-token
 * check exercises the server component + DB *read* path with a bogus token,
 * which reads but never writes.
 *
 * Run:
 *   source ~/.nvm/nvm.sh && nvm use 20 && \
 *     npx playwright test --project=mock e2e/smoke.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Tier A — render/hydration smoke (no DB writes)', () => {
  test('hub / renders the occasion picker with the memorial option', async ({ page }) => {
    await page.goto('/');

    // The occasion-picker section heading.
    await expect(
      page.getByRole('heading', { name: 'One way to honor every kind of moment' }),
    ).toBeVisible();

    // The Memorial occasion card (OccasionPicker renders aria-label="Memorial
    // collection"). exact:true disambiguates from the "Start a Memorial
    // Collection →" CTA link further down the page.
    await expect(
      page.getByRole('link', { name: 'Memorial collection', exact: true }),
    ).toBeVisible();

    // Hero headline confirms the page hydrated, not just a shell.
    await expect(
      page.getByRole('heading', { name: /no one person holds the whole story/i }),
    ).toBeVisible();
  });

  test('memorial create flow renders the create form with interactive fields', async ({ page }) => {
    // /memorial → landing; /memorial/start → the CreateForm. Hit /start directly;
    // the landing CTA routes here in formFirst nav mode.
    await page.goto('/memorial/start');

    // Form heading.
    await expect(
      page.getByRole('heading', { name: 'Set up the collection and write your first memory' }),
    ).toBeVisible();

    // Key labeled fields are present AND interactive. FieldRow binds
    // <label htmlFor={name}> to the control, so each input/textarea has an
    // accessible name equal to its label — we target by role+name (most robust;
    // a "Your email" section heading shares the text but isn't a textbox). We
    // type into them to prove hydration, but never submit — nothing reaches the DB.
    const email = page.getByRole('textbox', { name: 'Your email', exact: true });
    await expect(email).toBeVisible();
    await email.fill('smoke-test@example.com');
    await expect(email).toHaveValue('smoke-test@example.com');

    const honoreeName = page.getByRole('textbox', { name: 'Their name', exact: true });
    await expect(honoreeName).toBeVisible();
    await honoreeName.fill('Smoke Test Honoree');
    await expect(honoreeName).toHaveValue('Smoke Test Honoree');

    // The memory textarea (label "2–3 specific memories or stories").
    const memory = page.getByRole('textbox', { name: /specific memories or stories/i });
    await expect(memory).toBeVisible();
    await memory.fill('A short hydration probe.');
    await expect(memory).toHaveValue('A short hydration probe.');

    // The submit button exists — but we intentionally do NOT click it.
    await expect(
      page.getByRole('button', { name: /create collection & add my memory/i }),
    ).toBeVisible();
  });

  // MF-4a (SES-048): browser coverage used to be memorial-only, so a broken or
  // mis-wired config for wedding/retirement/anniversary (e.g. the wedding-specific
  // relationship Select) would ship unseen. Load EVERY live occasion's landing +
  // create form and assert it renders, hydrates, and carries its OWN copy.
  const OCCASIONS = [
    { slug: 'memorial', honoree: 'the person we are honoring' },
    { slug: 'wedding', honoree: 'the couple' },
    { slug: 'retirement', honoree: 'the person retiring' },
    { slug: 'anniversary', honoree: 'the couple' },
  ] as const;

  for (const { slug, honoree } of OCCASIONS) {
    test(`${slug}: landing renders and create form hydrates with its own copy`, async ({ page }) => {
      // Landing (the ad-click destination) builds + renders a top-level heading.
      await page.goto(`/${slug}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      // /start → CreateForm. Shared heading proves the per-occasion config resolved.
      await page.goto(`/${slug}/start`);
      await expect(
        page.getByRole('heading', { name: 'Set up the collection and write your first memory' }),
      ).toBeVisible();

      // Occasion-specific copy: the relationship field names this occasion's
      // honoree label ("the couple" vs "the person retiring" …) — proves the RIGHT
      // config is wired, not memorial's, on a celebratory occasion.
      await expect(page.getByText(`Your relationship to ${honoree}`).first()).toBeVisible();

      // Hydration probe: the email field is interactive. We never submit.
      const email = page.getByRole('textbox', { name: 'Your email', exact: true });
      await expect(email).toBeVisible();
      await email.fill('smoke@example.com');
      await expect(email).toHaveValue('smoke@example.com');
    });
  }

  test('bogus contributor token renders the graceful not-found screen (DB read only)', async ({
    page,
  }) => {
    // Exercises the /c/[shareToken] server component + getCollectionByShareToken
    // read path with a token that resolves to nothing → "This link isn't active".
    await page.goto('/c/does-not-exist');

    await expect(
      page.getByRole('heading', { name: /this link isn.?t active|this collection has closed/i }),
    ).toBeVisible();
  });

  test('legal pages build and render their headings', async ({ page }) => {
    for (const [path, heading] of [
      ['/terms', 'Terms of Service'],
      ['/privacy', 'Privacy Policy'],
      ['/refund', 'Refund Policy'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    }
  });

  test('create page hydrates without uncaught console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/memorial/start');
    await expect(
      page.getByRole('heading', { name: 'Set up the collection and write your first memory' }),
    ).toBeVisible();
    // Give client hydration a beat to surface any runtime errors.
    await page.waitForLoadState('networkidle');

    // Filter benign noise: favicon 404s, and analytics (Vercel Analytics is
    // intentionally disabled in this test env, and its debug script is blocked by
    // the app's Content-Security-Policy — neither indicates app breakage).
    const fatal = errors.filter(
      (e) =>
        !/favicon/i.test(e) &&
        !/analytics/i.test(e) &&
        !/va\.vercel-scripts\.com/i.test(e) &&
        !/vercel-scripts|vitals\.vercel/i.test(e) &&
        !/Failed to load resource.*404/i.test(e),
    );
    expect(fatal, `Unexpected console/page errors:\n${fatal.join('\n')}`).toHaveLength(0);
  });
});
