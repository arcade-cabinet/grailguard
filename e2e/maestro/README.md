# Maestro Mobile Test Flows

These YAML flows are for testing the **Capacitor native builds** (iOS/Android), not the web app.

## Prerequisites

- [Maestro CLI](https://maestro.mobile.dev/) installed
- A running iOS simulator or Android emulator
- The Capacitor app built and installed on the device/emulator

## Running

```bash
# Run a single flow
maestro test e2e/maestro/gameFlow.yaml

# Run all flows
maestro test e2e/maestro/
```

## Flows

- **gameFlow.yaml** -- Launches the app, opens the Embark modal, starts a run, and verifies the game screen loads.
- **metaScreens.yaml** -- Navigates to Codex and Settings screens from the main menu.

## Notes

- Screenshots are saved to `e2e/maestro/screenshots/`.
- These flows test the native Capacitor wrapper, not the Vite web build. For web E2E tests, use Playwright (`pnpm test:e2e`).
