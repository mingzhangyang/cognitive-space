<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy the Cloudflare Worker app

This project serves the React UI as static assets and exposes a Worker API at `/api/analyze`.

## Prerequisites

- Node.js
- Cloudflare Wrangler (`npm install`)

## Local development

1. Install dependencies:
   `npm install`
2. Set `BIGMODEL_API_KEY` using Wrangler:
   `wrangler secret put BIGMODEL_API_KEY`
3. Run the Worker locally (builds assets first):
   `npm run dev`
4. Optional UI-only dev server (no Worker API):
   `npm run dev:ui`

## Deploy

1. Build the static assets:
   `npm run build`
2. Deploy the Worker:
   `npm run deploy`

## Configuration

- `BIGMODEL_API_KEY` is required.
- `BIGMODEL_MODEL` is optional (default: `glm-4.5-flash`).
