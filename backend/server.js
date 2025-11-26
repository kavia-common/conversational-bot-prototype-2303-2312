'use strict';

/**
 * Simple Express backend for local development.
 * - Serves a healthcheck at /healthz
 * - Provides a placeholder /api/generate endpoint
 * - Enables CORS for http://localhost:3000 by default
 *
 * Environment:
 * - PORT: backend port (default 8000)
 * - CORS_ORIGIN: allowed origin for CORS (default http://localhost:3000)
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Config via env with defaults
const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '8000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

// Healthcheck
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'proto-bot-backend' });
});

// Minimal placeholder generate endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    // This is a placeholder response that echoes the prompt.
    // Frontend expects either { html } or { code, meta } shapes. We'll send html.
    const safePrompt = String(prompt).slice(0, 500);
    const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Generated Prototype</title>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:16px;">
  <h1 style="margin:0 0 8px 0; color:#2563EB;">Backend Prototype</h1>
  <p style="margin:0 0 12px 0; color:#374151;">This HTML was returned by the local Express backend.</p>
  <pre style="background:#F3F4F6; border:1px solid #E5E7EB; border-radius:8px; padding:12px; white-space:pre-wrap;">
Prompt: ${safePrompt || '(empty)'}
  </pre>
</body>
</html>`;

    res.status(200).json({ html, content: `Generated for: ${safePrompt}` });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] Listening on http://localhost:${PORT} (CORS origin: ${CORS_ORIGIN})`);
});
