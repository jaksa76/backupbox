# Playwright Tests

This directory contains end-to-end tests for the BackupBox PWA using Playwright.

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test tests/app.spec.js
```

## Test Files

- **app.spec.js** - Tests for basic app functionality, UI elements, and initial state
- **pwa.spec.js** - Tests for PWA features like service worker and manifest
- **ui.spec.js** - Tests for UI interactions, styling, and accessibility

## Test Coverage

The tests cover:
- ✓ Page loading and basic rendering
- ✓ Button states and visibility
- ✓ Status messages and UI updates
- ✓ Service worker registration
- ✓ PWA manifest and meta tags
- ✓ Accessibility features (ARIA attributes)
- ✓ Initial application state

## Viewing Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Configuration

Test configuration is in `playwright.config.js` at the project root.
