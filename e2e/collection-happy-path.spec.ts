/**
 * Tier B — full mutating happy-path. GATED + self-cleaning. SKIPPED BY DEFAULT.
 *
 * ⚠️  THIS SPEC WRITES TO THE DATABASE. ⚠️
 *
 * It creates a real collection, adds memories, moderates, pays via the MOCK
 * payment path, and reaches a finalized tribute. Because the dev server reads
 * .env.development.local — which points at the SHARED PRODUCTION Neon DB — you
 * must NOT run this against that DB.
 *
 * BEFORE flipping the gate:
 *   1. Create a dedicated, disposable Neon *test branch*.
 *   2. Point the dev server at it by overriding DATABASE_URL to that branch's
 *      connection string (e.g. in .env.development.local, or inline before the
 *      webServer command). Confirm it is NOT the production branch.
 *   3. Then run:
 *        source ~/.nvm/nvm.sh && nvm use 20 && \
 *          E2E_ALLOW_DB_WRITES=1 npx playwright test --project=mock \
 *          e2e/collection-happy-path.spec.ts
 *
 * The test tags its data (test honoree name + a +e2e email) and cleans up at the
 * end by calling POST /api/collection/delete with the adminToken (cascades to all
 * contributions). Cleanup is best-effort in an afterEach so a mid-flow failure
 * still tries to remove the row.
 */
import { test, expect, type Page } from '@playwright/test';

const GATE_REASON = 'requires explicit opt-in + non-prod DB (E2E_ALLOW_DB_WRITES=1)';
test.skip(process.env.E2E_ALLOW_DB_WRITES !== '1', GATE_REASON);

// Obvious test data so a stray row is recognizable and filterable.
const STAMP = Date.now();
const HONOREE = `E2E Test Honoree ${STAMP}`;
const ORGANIZER_EMAIL = `wtm-e2e+e2e-${STAMP}@example.com`;
// A DIFFERENT address for the contributor — must not equal the organizer's (the
// contribute route rejects the organizer email on the public link) and is the
// one-per-person dedup key.
const CONTRIBUTOR_EMAIL = `wtm-e2e+c-${STAMP}@example.com`;

// Captured during the run so afterEach can clean up even on failure.
let capturedAdminToken: string | null = null;

async function cleanup(page: Page) {
  if (!capturedAdminToken) return;
  try {
    const res = await page.request.post('/api/collection/delete', {
      data: { adminToken: capturedAdminToken },
    });
    // 200 on success; tolerate already-deleted.
    if (!res.ok()) {
      console.log(`[happy-path cleanup] delete returned ${res.status()} — may already be gone.`);
    }
  } catch (err) {
    console.log(`[happy-path cleanup] delete failed (non-fatal): ${String(err)}`);
  } finally {
    capturedAdminToken = null;
  }
}

test.describe('Tier B — full collection happy-path (mock payment, self-cleaning)', () => {
  test.afterEach(async ({ page }) => {
    await cleanup(page);
  });

  test('create → contribute → moderate → mock-pay → tribute', async ({ page }) => {
    // ── 1. Create the collection + organizer's first memory ─────────────────
    await page.goto('/memorial/start');

    // Target by role+accessible-name (NOT getByLabel exact): required-field labels
    // carry a decorative aria-hidden "*", so the accessible name is e.g. "Your
    // email" but the label TEXT is "Your email*". getByRole(name) uses the
    // accessible name (asterisk excluded); getByLabel(exact) would never match.
    await page.getByRole('textbox', { name: 'Your email', exact: true }).fill(ORGANIZER_EMAIL);
    await page.getByRole('textbox', { name: 'Confirm your email', exact: true }).fill(ORGANIZER_EMAIL);
    await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('E2E Organizer');

    // Relationship select (venture-core Select — open then pick an option).
    await page.getByLabel(/your relationship to/i).click();
    await page.getByRole('option', { name: /son or daughter/i }).click();

    await page.getByLabel(/describe your relationship/i).fill('their eldest child');
    await page.getByRole('textbox', { name: 'Their name', exact: true }).fill(HONOREE);
    await page
      .getByLabel(/specific memories or stories/i)
      .fill(
        'She kept a recipe box that was never really about recipes. Tucked between the cards ' +
          'were birthdays and the names of everyone\'s dogs. She made every person who walked in ' +
          'feel known, and she always put down whatever she was holding the moment you arrived.',
      );
    await page
      .getByLabel(/what qualities made them/i)
      .fill('endlessly attentive, quietly generous, the first to show up when anyone needed help');

    // Consent + submit.
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /create collection & add my memory/i }).click();

    // Lands on the manage dashboard (?t={adminToken}). Capture the token.
    await page.waitForURL(/\/collect\/manage\?t=/, { timeout: 30_000 });
    const url = new URL(page.url());
    capturedAdminToken = url.searchParams.get('t');
    expect(capturedAdminToken, 'admin token should be present in manage URL').toBeTruthy();

    // The dashboard shows the honoree and the share link.
    await expect(page.getByText(HONOREE, { exact: false }).first()).toBeVisible();

    // ── 2. A contributor adds a memory via the share link ───────────────────
    // The dashboard (InviteBlock hero) renders the full share URL as TEXT, not an
    // <a>, so read the visible URL and pull the token out. (Bounded timeout — a
    // missing element should fail fast, not eat the whole test budget.)
    const shareText = await page
      .getByText(/\/c\/[A-Za-z0-9_-]+/)
      .first()
      .textContent({ timeout: 15_000 });
    const shareToken = shareText?.match(/\/c\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
    expect(shareToken, 'should resolve a contributor share token').toBeTruthy();

    const contributor = await page.context().newPage();
    await contributor.goto(`/c/${shareToken}`);
    await contributor.getByLabel(/your name/i).fill('E2E Contributor');
    // Contributors must supply an email (required; one-per-person key). Distinct
    // from the organizer's so it isn't rejected as the organizer address.
    await contributor.getByRole('textbox', { name: 'Your email', exact: true }).fill(CONTRIBUTOR_EMAIL);
    await contributor.getByLabel(/share a memory/i).fill(
      'I will always remember the way the kitchen smelled on Sundays, and how he slipped a few ' +
        'dollars into your pocket on the way out without ever saying a word about it.',
    );
    await contributor.getByRole('checkbox').first().check();
    await contributor.getByRole('button', { name: /add (my )?memory|submit/i }).click();
    await expect(contributor.getByText(/thank you/i).first()).toBeVisible({ timeout: 30_000 });
    await contributor.close();

    // ── 3. Moderate — confirm both memories are present on the dashboard ─────
    await page.reload();
    await expect(page.getByText('E2E Contributor', { exact: false }).first()).toBeVisible();

    // ── 4. Finalize → prefs/pay page ────────────────────────────────────────
    // The dashboard "Review & create the {noun}" button navigates to the result
    // page (resultPath?t=adminToken) in the unpaid pay-at-finalize flow.
    await page.getByRole('button', { name: /review & create the/i }).click();
    await page.waitForURL(/\/memorial\/result/, { timeout: 30_000 });

    // ── 5. Pay (mock) + create on the prefs page ────────────────────────────
    // Defaults for tone/length are fine. Accept the pay-time terms, then "Create
    // my {noun}" runs the MOCK checkout (no Paddle) → REAL synthesis (Haiku).
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: /create my /i }).click();

    // ── 6. Reach the generated tribute (done screen) ────────────────────────
    await expect(page.getByText(HONOREE, { exact: false }).first()).toBeVisible({ timeout: 90_000 });

    // Cleanup runs in afterEach via the captured admin token.
  });
});
