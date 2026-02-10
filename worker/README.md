# Worker Architecture

This folder contains the Cloudflare Worker server logic, split into focused modules to keep the entrypoint small and behavior testable.

## Entry Point

`worker.ts` wires routes, handles asset fallbacks, and delegates API work to handlers.

## Modules

`worker/types.ts` defines shared request/response shapes and the worker `Env` interface.
`worker/constants.ts` holds thresholds and model configuration defaults.
`worker/utils.ts` provides small helpers: `asRecord`, `safeParseJson`, `jsonResponse`, and `hashString`.
`worker/cache.ts` builds cache keys, requests, and writes cache responses.
`worker/aiClient.ts` wraps outbound AI requests and response extraction.
`worker/prompts.ts` contains prompt builders and the heuristic fallback classifier.
`worker/normalize.ts` normalizes AI output and enforces validation rules.

## Handlers

`worker/handlers/analyze.ts` handles `POST /api/analyze`.
`worker/handlers/wanderingPlanet.ts` handles `POST /api/wandering-planet/analyze`.

## Testing

Unit tests import `normalizeResult` and `normalizeWanderingPlanetResult` from `worker.ts`, which re-exports them from `worker/normalize.ts`.
