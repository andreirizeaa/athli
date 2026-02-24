# Docs Screenshot Automation

Automated screenshot capture for help center articles using Playwright.

## Prerequisites

1. Install Playwright:
   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   ```

2. Create a `.env.screenshots` file in the repo root:
   ```env
   SCREENSHOT_BASE_URL=http://localhost:3001
   SCREENSHOT_EMAIL=your-test-account@email.com
   SCREENSHOT_PASSWORD=your-test-password
   ```

3. Make sure the web app is running locally with seeded demo data.

## Usage

```bash
# Run all screenshots
npx playwright test scripts/screenshots/capture.spec.ts

# Run a specific category
npx playwright test scripts/screenshots/capture.spec.ts --grep "dashboard"

# Run in headed mode to watch
npx playwright test scripts/screenshots/capture.spec.ts --headed
```

## Output

Screenshots are saved to `docs/help-center/screenshots/` organized by doc section.

## Notes

- Screenshots are captured at 1440x900 (desktop viewport)
- Light mode by default
- Uses a seeded test account with demo data
- Some screenshots require specific UI interactions (opening panels, dialogs)
