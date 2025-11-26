# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Features

- Lightweight: No heavy UI frameworks - uses only vanilla CSS and React
- Modern UI: Clean, responsive design with KAVIA brand styling
- Fast: Minimal dependencies for quick loading times
- Simple: Easy to understand and modify

## Getting Started

In the project directory, you can run:

### `npm start`

Runs the app in development mode.
Open http://localhost:3000 to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

## Environment Helper and Feature Flags

Environment variables are centralized in `src/utils/env.js` and normalized with safe defaults. Common variables:

- REACT_APP_API_BASE, REACT_APP_BACKEND_URL, REACT_APP_FRONTEND_URL, REACT_APP_WS_URL
- REACT_APP_NODE_ENV, REACT_APP_NEXT_TELEMETRY_DISABLED, REACT_APP_ENABLE_SOURCE_MAPS
- REACT_APP_PORT, REACT_APP_TRUST_PROXY, REACT_APP_LOG_LEVEL, REACT_APP_HEALTHCHECK_PATH
- REACT_APP_FEATURE_FLAGS (JSON or CSV), REACT_APP_EXPERIMENTS_ENABLED
- REACT_APP_OLLAMA_BASE_URL, REACT_APP_OLLAMA_MODEL

Usage:
import env from './src/utils/env';
const { API_BASE, WS_URL, FEATURE_FLAGS } = env();

Feature flags can be gated in UI via `FeatureFlagGate`:
- File: `src/components/FeatureFlagGate.jsx`
- Example: <FeatureFlagGate flag="demoPanel"> ... </FeatureFlagGate>

## Customization

### Colors

The main brand colors are defined as CSS variables in `src/App.css`.

### Components

This template uses pure HTML/CSS components instead of a UI framework. You can find component styles in `src/App.css`.

Common components include:
- Buttons (`.btn`, `.btn-large`)
- Container (`.container`)
- Navigation (`.navbar`)
- Typography (`.title`, `.subtitle`, `.description`)

## Learn More

To learn React, check out the React documentation.
