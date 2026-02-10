# Cognitive Space

Cognitive Space is a web application designed to help users organize and explore their thoughts, questions, and ideas. It allows you to drop unstructured thoughts, promote them into structured questions, and build context with claims, evidence, and triggers. Visualize connections between questions to uncover emerging patterns.

Built with React for the frontend and deployed as a Cloudflare Worker for the backend API.

## Features

- **Thought Capture**: Quickly jot down ideas without structure.
- **Question Organization**: Promote thoughts into questions and add supporting elements.
- **Visualization**: Explore relationships between questions graphically.
- **Wandering Planet Recovery**: Rescue orphaned thoughts and link them back.
- **PWA Support**: Installable as a progressive web app.

## Guide

1. Open the app and use `Just write` to drop a thought without worrying about structure.
2. Create a new Question by tagging or promoting a thought when the theme becomes clear.
3. Add supporting notes as Claims, Evidence, or Triggers to build context over time.
4. Use `Visualize` to explore related questions and spot emerging clusters.
5. Visit `Wandering Planet` to rescue orphaned fragments and link them to a question.

For more details, see [Product Design](docs/product_design.md) and [Visualization Proposal](docs/visualization_proposal.md).

## Prerequisites

- Node.js (version 18 or higher)
- Cloudflare Wrangler CLI (`npm install -g wrangler`)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mingzhangyang/cognitive-space
   cd cognitive-space
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Local Development

1. Set the `BIGMODEL_API_KEY` secret using Wrangler:
   ```bash
   wrangler secret put BIGMODEL_API_KEY
   ```

2. Run the Worker locally (builds assets first):
   ```bash
   npm run dev
   ```

3. Optional: Run UI-only dev server (no Worker API):
   ```bash
   npm run dev:ui
   ```

## Deployment

1. Build the static assets:
   ```bash
   npm run build
   ```

2. Deploy the Worker:
   ```bash
   npm run deploy
   ```

## Configuration

- `BIGMODEL_API_KEY`: Required. Your API key for the AI model.
- `BIGMODEL_MODEL`: Optional. Defaults to `glm-4.7-flashx`. Specify a different model if needed.
- `VITE_BUILD_ID`: Optional. Injected by build scripts for service worker cache versioning. Override to control the cache tag.

## Scripts

- `npm run build`: Builds the static assets.
- `npm run dev`: Runs the Worker locally.
- `npm run dev:ui`: Runs the UI dev server.
- `npm run preview`: Builds the assets and runs the Worker locally.
- `npm run deploy`: Deploys to Cloudflare.

## Contributing

Contributions are welcome! Please read the contributing guidelines (if any) before submitting a pull request.

## License

This project is licensed under the MIT License.
