import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'help-center', 'screenshots');

// Ensure output directories exist
function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

// Take a named screenshot
async function snap(page: Page, category: string, name: string) {
  const dir = path.join(SCREENSHOT_DIR, category);
  ensureDir(dir);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: false });
}

// Wait for page to be fully loaded and stable
async function waitForStable(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// Click and wait for side panel to open
async function openSidePanel(page: Page, buttonText: string) {
  await page.click(`button:has-text("${buttonText}"), [aria-label="${buttonText}"]`);
  await page.waitForTimeout(500);
}

// ============================================================================
// AUTH
// ============================================================================

test.describe('Auth', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/auth/login');
    await page.fill('input[type="email"], input[name="email"]', process.env.SCREENSHOT_EMAIL!);
    await page.fill('input[type="password"], input[name="password"]', process.env.SCREENSHOT_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/home**', { timeout: 15_000 });
    
    // Save auth state
    await context.storageState({ path: path.join(SCREENSHOT_DIR, '.auth.json') });
    await context.close();
  });
});

// Use authenticated state for all subsequent tests
test.describe('Screenshots', () => {
  test.use({ storageState: path.join(SCREENSHOT_DIR, '.auth.json') });

  // ==========================================================================
  // GETTING STARTED
  // ==========================================================================

  test.describe('getting-started', () => {
    test('02 - creating your account', async ({ page }) => {
      // Screenshot 1: Sign up page
      await page.goto('/auth/register');
      await waitForStable(page);
      await snap(page, 'getting-started', '02-sign-up-page');

      // Screenshots 3-4 need the app
      await page.goto('/home');
      await waitForStable(page);
      await snap(page, 'getting-started', '02-home-dashboard');
    });

    test('03 - inviting your first client', async ({ page }) => {
      await page.goto('/athletes');
      await waitForStable(page);

      // Add client panel
      await openSidePanel(page, 'Add');
      await snap(page, 'getting-started', '03-add-client-panel');
      await page.keyboard.press('Escape');
    });

    test('04 - plans and billing', async ({ page }) => {
      await page.goto('/settings/billing');
      await waitForStable(page);
      await snap(page, 'getting-started', '04-billing-page');
    });

    test('05 - understanding plans', async ({ page }) => {
      await page.goto('/settings/billing/update');
      await waitForStable(page);
      await snap(page, 'getting-started', '05-pricing-page');
    });
  });

  // ==========================================================================
  // COACH WEB - DASHBOARD
  // ==========================================================================

  test.describe('coach-web/01-dashboard', () => {
    test('dashboard overview', async ({ page }) => {
      await page.goto('/home');
      await waitForStable(page);
      await snap(page, 'coach-web', '01-dashboard-full');

      // Summary cards at top
      await snap(page, 'coach-web', '01-dashboard-summary-cards');
    });
  });

  // ==========================================================================
  // COACH WEB - CLIENT MANAGEMENT
  // ==========================================================================

  test.describe('coach-web/02-client-management', () => {
    test('athletes page', async ({ page }) => {
      await page.goto('/athletes');
      await waitForStable(page);
      await snap(page, 'coach-web', '02-athletes-list');
    });

    test('add client panel', async ({ page }) => {
      await page.goto('/athletes');
      await waitForStable(page);
      await openSidePanel(page, 'Add');
      await snap(page, 'coach-web', '02-add-client-panel');
      await page.keyboard.press('Escape');
    });

    test('client overview', async ({ page }) => {
      await page.goto('/athletes');
      await waitForStable(page);
      // Click first client
      const firstClient = page.locator('table tbody tr, [data-testid="client-row"]').first();
      if (await firstClient.isVisible()) {
        await firstClient.click();
        await waitForStable(page);
        await snap(page, 'coach-web', '02-client-overview');
      }
    });
  });

  // ==========================================================================
  // COACH WEB - TRAINING PROGRAMS
  // ==========================================================================

  test.describe('coach-web/03-training-programs', () => {
    test('programs library', async ({ page }) => {
      await page.goto('/library/training/programs');
      await waitForStable(page);
      await snap(page, 'coach-web', '03-programs-library');
    });

    test('new program form', async ({ page }) => {
      await page.goto('/library/training/programs/new');
      await waitForStable(page);
      await snap(page, 'coach-web', '03-new-program-form');
    });
  });

  // ==========================================================================
  // COACH WEB - WORKOUT BUILDER
  // ==========================================================================

  test.describe('coach-web/04-workout-builder', () => {
    test('workout library', async ({ page }) => {
      await page.goto('/library/training/workouts');
      await waitForStable(page);
      await snap(page, 'coach-web', '04-workout-library');
    });
  });

  // ==========================================================================
  // COACH WEB - EXERCISE LIBRARY
  // ==========================================================================

  test.describe('coach-web/05-exercise-library', () => {
    test('exercise library', async ({ page }) => {
      await page.goto('/library/training/exercises');
      await waitForStable(page);
      await snap(page, 'coach-web', '05-exercise-library');
    });
  });

  // ==========================================================================
  // COACH WEB - CHECK-INS
  // ==========================================================================

  test.describe('coach-web/06-check-ins', () => {
    test('check-ins library', async ({ page }) => {
      await page.goto('/library/forms/check-ins');
      await waitForStable(page);
      await snap(page, 'coach-web', '06-check-ins-library');
    });

    test('check-ins review', async ({ page }) => {
      await page.goto('/check-ins');
      await waitForStable(page);
      await snap(page, 'coach-web', '06-check-ins-review');
    });
  });

  // ==========================================================================
  // COACH WEB - QUESTIONNAIRES
  // ==========================================================================

  test.describe('coach-web/07-questionnaires', () => {
    test('questionnaires library', async ({ page }) => {
      await page.goto('/library/forms/questionnaires');
      await waitForStable(page);
      await snap(page, 'coach-web', '07-questionnaires-library');
    });
  });

  // ==========================================================================
  // COACH WEB - HABITS
  // ==========================================================================

  test.describe('coach-web/08-habits', () => {
    test('habits library', async ({ page }) => {
      await page.goto('/library/habits');
      await waitForStable(page);
      await snap(page, 'coach-web', '08-habits-library');
    });
  });

  // ==========================================================================
  // COACH WEB - METRICS
  // ==========================================================================

  test.describe('coach-web/09-metrics', () => {
    test('metrics library', async ({ page }) => {
      await page.goto('/library/metrics');
      await waitForStable(page);
      await snap(page, 'coach-web', '09-metrics-library');
    });
  });

  // ==========================================================================
  // COACH WEB - PROGRESS PHOTOS (requires client navigation)
  // ==========================================================================

  test.describe('coach-web/10-progress-photos', () => {
    test('client photos tab', async ({ page }) => {
      await page.goto('/athletes');
      await waitForStable(page);
      const firstClient = page.locator('table tbody tr, [data-testid="client-row"]').first();
      if (await firstClient.isVisible()) {
        await firstClient.click();
        await waitForStable(page);
        // Navigate to photos tab
        await page.click('a:has-text("Photos"), button:has-text("Photos")');
        await waitForStable(page);
        await snap(page, 'coach-web', '10-photos-tab');
      }
    });
  });

  // ==========================================================================
  // COACH WEB - MESSAGING
  // ==========================================================================

  test.describe('coach-web/11-messaging', () => {
    test('inbox', async ({ page }) => {
      await page.goto('/inbox');
      await waitForStable(page);
      await snap(page, 'coach-web', '11-inbox');
    });

    test('inbox with conversation', async ({ page }) => {
      await page.goto('/inbox');
      await waitForStable(page);
      // Click first conversation
      const firstConvo = page.locator('[data-testid="conversation-item"], .conversation-item').first();
      if (await firstConvo.isVisible()) {
        await firstConvo.click();
        await waitForStable(page);
        await snap(page, 'coach-web', '11-inbox-conversation');
      }
    });
  });

  // ==========================================================================
  // COACH WEB - AI ASSISTANT
  // ==========================================================================

  test.describe('coach-web/12-ai-assistant', () => {
    test('assistant page', async ({ page }) => {
      await page.goto('/assistant');
      await waitForStable(page);
      await snap(page, 'coach-web', '12-ai-assistant-empty');
    });
  });

  // ==========================================================================
  // COACH WEB - AUTOMATIONS
  // ==========================================================================

  test.describe('coach-web/13-automations', () => {
    test('flows page', async ({ page }) => {
      await page.goto('/flows');
      await waitForStable(page);
      await snap(page, 'coach-web', '13-flows-page');
    });
  });

  // ==========================================================================
  // COACH WEB - ONBOARDING FLOWS
  // ==========================================================================

  test.describe('coach-web/14-onboarding-flows', () => {
    test('onboarding page', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForStable(page);
      await snap(page, 'coach-web', '14-onboarding-page');
    });
  });

  // ==========================================================================
  // COACH WEB - BUSINESS PACKAGES
  // ==========================================================================

  test.describe('coach-web/15-business-packages', () => {
    test('packages page', async ({ page }) => {
      await page.goto('/business/packages');
      await waitForStable(page);
      await snap(page, 'coach-web', '15-packages-page');
    });

    test('activity page', async ({ page }) => {
      await page.goto('/business/activity');
      await waitForStable(page);
      await snap(page, 'coach-web', '15-activity-page');
    });
  });

  // ==========================================================================
  // COACH WEB - COUPONS
  // ==========================================================================

  test.describe('coach-web/16-coupons', () => {
    test('coupons page', async ({ page }) => {
      await page.goto('/business/coupons');
      await waitForStable(page);
      await snap(page, 'coach-web', '16-coupons-page');
    });
  });

  // ==========================================================================
  // COACH WEB - FILES
  // ==========================================================================

  test.describe('coach-web/17-files', () => {
    test('files library', async ({ page }) => {
      await page.goto('/library/files');
      await waitForStable(page);
      await snap(page, 'coach-web', '17-files-library');
    });
  });

  // ==========================================================================
  // COACH WEB - TODO LIST
  // ==========================================================================

  test.describe('coach-web/18-todo-list', () => {
    test('athli assistant tab', async ({ page }) => {
      await page.goto('/todo/athli-assistant');
      await waitForStable(page);
      await snap(page, 'coach-web', '18-todo-athli-assistant');
    });

    test('your list tab', async ({ page }) => {
      await page.goto('/todo/your-list');
      await waitForStable(page);
      await snap(page, 'coach-web', '18-todo-your-list');
    });
  });

  // ==========================================================================
  // COACH WEB - SETTINGS
  // ==========================================================================

  test.describe('coach-web/19-settings', () => {
    test('profile settings', async ({ page }) => {
      await page.goto('/settings/account/profile');
      await waitForStable(page);
      await snap(page, 'coach-web', '19-settings-profile');
    });

    test('security settings', async ({ page }) => {
      await page.goto('/settings/account/security');
      await waitForStable(page);
      await snap(page, 'coach-web', '19-settings-security');
    });

    test('company information', async ({ page }) => {
      await page.goto('/settings/business/company/information');
      await waitForStable(page);
      await snap(page, 'coach-web', '19-settings-company');
    });

    test('customisations', async ({ page }) => {
      await page.goto('/settings/app/customisations');
      await waitForStable(page);
      await snap(page, 'coach-web', '19-settings-customisations');
    });

    test('notifications', async ({ page }) => {
      await page.goto('/settings/profile/notifications');
      await waitForStable(page);
      await snap(page, 'coach-web', '19-settings-notifications');
    });

    test('danger zone', async ({ page }) => {
      await page.goto('/settings/account/danger');
      await waitForStable(page);
      await snap(page, 'coach-web', '19-settings-danger-zone');
    });
  });

  // ==========================================================================
  // COACH WEB - REFER AND EARN
  // ==========================================================================

  test.describe('coach-web/20-refer-and-earn', () => {
    test('refer page', async ({ page }) => {
      await page.goto('/refer-and-earn');
      await waitForStable(page);
      await snap(page, 'coach-web', '20-refer-and-earn');
    });
  });

  // ==========================================================================
  // COACH WEB - BUSINESS SEQUENCES
  // ==========================================================================

  test.describe('coach-web/22-business-sequences', () => {
    test('sequences list', async ({ page }) => {
      await page.goto('/business/sequences');
      await waitForStable(page);
      await snap(page, 'coach-web', '22-sequences-list');
    });
  });

  // ==========================================================================
  // COACH WEB - CLIENT NOTES
  // ==========================================================================

  test.describe('coach-web/23-client-notes', () => {
    test('client notes tab', async ({ page }) => {
      await page.goto('/athletes');
      await waitForStable(page);
      const firstClient = page.locator('table tbody tr, [data-testid="client-row"]').first();
      if (await firstClient.isVisible()) {
        await firstClient.click();
        await waitForStable(page);
        await page.click('a:has-text("Notes"), button:has-text("Notes")');
        await waitForStable(page);
        await snap(page, 'coach-web', '23-client-notes');
      }
    });
  });

  // ==========================================================================
  // COACH WEB - FEATURE REQUESTS
  // ==========================================================================

  test.describe('coach-web/24-feature-requests', () => {
    test('feature requests page', async ({ page }) => {
      await page.goto('/features');
      await waitForStable(page);
      await snap(page, 'coach-web', '24-feature-requests');
    });
  });

  // ==========================================================================
  // COACH WEB - SECTION BUILDER
  // ==========================================================================

  test.describe('coach-web/25-section-builder', () => {
    test('sections library', async ({ page }) => {
      await page.goto('/library/training/sections');
      await waitForStable(page);
      await snap(page, 'coach-web', '25-sections-library');
    });
  });

  // ==========================================================================
  // COACH WEB - BILLING / SUBSCRIPTION
  // ==========================================================================

  test.describe('coach-web/26-managing-subscription', () => {
    test('billing page', async ({ page }) => {
      await page.goto('/settings/billing');
      await waitForStable(page);
      await snap(page, 'coach-web', '26-billing-page');
    });

    test('pricing update page', async ({ page }) => {
      await page.goto('/settings/billing/update');
      await waitForStable(page);
      await snap(page, 'coach-web', '26-pricing-update');
    });
  });

  // ==========================================================================
  // COACH WEB - CANCELLING / DANGER ZONE
  // ==========================================================================

  test.describe('coach-web/27-cancelling-reactivating', () => {
    test('danger zone', async ({ page }) => {
      await page.goto('/settings/account/danger');
      await waitForStable(page);
      await snap(page, 'coach-web', '27-danger-zone');
    });
  });

  // ==========================================================================
  // CLIENT PROFILE DEEP-DIVE (needs first client)
  // ==========================================================================

  test.describe('client-profile-deep-dive', () => {
    test('all client tabs', async ({ page }) => {
      await page.goto('/athletes');
      await waitForStable(page);

      // Get first client link
      const firstClient = page.locator('table tbody tr a, [data-testid="client-row"] a').first();
      if (await firstClient.isVisible()) {
        const href = await firstClient.getAttribute('href');
        if (!href) return;
        const clientBase = href.replace(/\/overview$/, '');

        // Overview
        await page.goto(clientBase + '/overview');
        await waitForStable(page);
        await snap(page, 'coach-web', '02-client-overview-page');

        // Training
        await page.goto(clientBase + '/training');
        await waitForStable(page);
        await snap(page, 'coach-web', '03-client-training');

        // Check-ins
        await page.goto(clientBase + '/check-in');
        await waitForStable(page);
        await snap(page, 'coach-web', '06-client-check-ins');

        // Habits
        await page.goto(clientBase + '/habits');
        await waitForStable(page);
        await snap(page, 'coach-web', '08-client-habits');

        // Metrics
        await page.goto(clientBase + '/metrics');
        await waitForStable(page);
        await snap(page, 'coach-web', '09-client-metrics');

        // Photos
        await page.goto(clientBase + '/photos');
        await waitForStable(page);
        await snap(page, 'coach-web', '10-client-photos');

        // Exercise History
        await page.goto(clientBase + '/exercise-history');
        await waitForStable(page);
        await snap(page, 'coach-web', 'client-exercise-history');

        // Files
        await page.goto(clientBase + '/files');
        await waitForStable(page);
        await snap(page, 'coach-web', '17-client-files');

        // Questionnaires
        await page.goto(clientBase + '/questionnaires');
        await waitForStable(page);
        await snap(page, 'coach-web', '07-client-questionnaires');

        // Notes
        await page.goto(clientBase + '/notes');
        await waitForStable(page);
        await snap(page, 'coach-web', '23-client-notes-page');

        // Settings
        await page.goto(clientBase + '/settings');
        await waitForStable(page);
        await snap(page, 'coach-web', '02-client-settings');
      }
    });
  });
});
