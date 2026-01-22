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


## Devcontainer

- Fleabox is installed automatically when the devcontainer is created. The container's `postCreateCommand` downloads the `fleabox` binary into `$HOME/.local/bin` and marks it executable.
- To apply the change locally: rebuild the devcontainer (Command Palette → "Dev Containers: Rebuild Container").

