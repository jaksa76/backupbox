# BackupBox PWA

Minimal Progressive Web App scaffold with service worker, manifest, and basic notification demo.

## Quick start

1. Install deps:

```bash
npm install
```

2. Serve with fleabox:

```bash
fleabox --dev --apps-dir /workspaces/
```

then open http://localhost:3000/backupbox/

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests with Playwright
```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# View test report
npx playwright show-report
```

The Playwright tests cover:
- UI elements and initial state
- PWA features (service worker, manifest)
- Accessibility (ARIA attributes)
- User interactions
- Button states and styling

## Devcontainer

- Fleabox is installed automatically when the devcontainer is created. The container's `postCreateCommand` downloads the `fleabox` binary into `$HOME/.local/bin` and marks it executable.
- To apply the change locally: rebuild the devcontainer (Command Palette → "Dev Containers: Rebuild Container").

