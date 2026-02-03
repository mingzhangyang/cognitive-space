# Run and deploy the Cloudflare Worker app

This project serves the React UI as static assets and exposes a Worker API at `/api/analyze`.

## Guide

1. Open the app and use `Just write` to drop a thought without worrying about structure.
2. Create a new Question by tagging or promoting a thought when the theme becomes clear.
3. Add supporting notes as Claims, Evidence, or Triggers to build context over time.
4. Use `Visualize` to explore related questions and spot emerging clusters.
5. Visit `Dark Matter` to rescue orphaned fragments and link them to a question.

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
