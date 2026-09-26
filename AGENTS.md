# Repository Guidelines

## Project Scope

This repository is the standalone Vue customer frontend for `helpdesk-agent`. Do not inspect or modify sibling projects unless the user explicitly names them.

## Code Comments

Add a short Chinese JSDoc comment to every newly written method. Explain the method's purpose in one or two sentences. Avoid line-by-line comments; add internal comments only for non-obvious streaming, authentication, concurrency, or business rules. Prefer Chinese test names.

## Change Notes

After every implementation change, add or update a Chinese Markdown summary under `notes/` using `YYYY-MM-DD-topic.md`. Include behavior, added and modified files, API impact, verification, and known limitations.

## Development Rules

- Use Vue 3 Composition API and TypeScript.
- Keep API calls under `src/api/`, shared types under `src/types/`, and reusable UI under `src/components/`.
- Never commit API keys, JWTs, `.env.local`, build output, logs, or `node_modules/`.
- Run `npm run test` and `npm run build` before committing.
