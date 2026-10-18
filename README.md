# Side Hustle Code

An OpenCode-inspired browser coding workspace: edit project files, ask an AI coding assistant about the selected file, and explore a clean IDE-style interface.

> This is an independent project inspired by AI coding-agent workflows. It is not the official OpenCode application and does not contain a full port of the upstream codebase.

## Features

- Dark, responsive browser IDE with file explorer, editor, preview, and terminal panel.
- AI chat with selected-file context and conversation history.
- OpenAI-compatible provider configuration using server-side environment variables.
- In-memory sample workspace with file editing and new-file creation.
- Dockerfile and Render Blueprint configuration.

## Current limitations

This initial version is a starter, not a feature-complete OpenCode replica. The terminal is intentionally simulated: arbitrary shell commands, real Git operations, repository cloning, user authentication, multi-user isolation, code execution, and durable project storage are not implemented. Workspace files and chat sessions live in server memory and reset when the service restarts. Do not upload confidential code or expose the demo to untrusted users.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env
# Edit .env with an OpenAI-compatible provider URL, key, and model.
npm run dev
```

Vite runs at `http://localhost:5173`. For a production-style local run:

```bash
npm run build
npm start
```

Then open `http://localhost:3000`.

## Configure AI

Set server-side environment variables. Never place provider secrets in frontend variables.

| Variable | Purpose |
| --- | --- |
| `AI_API_KEY` | Secret key for your chosen provider |
| `AI_BASE_URL` | Optional OpenAI-compatible API base URL |
| `AI_MODEL` | Model identifier expected by the provider |

Use the exact endpoint and model identifier from your provider. A valid API key and quota are required for chat.

## Deploy to Render

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Choose **New → Blueprint** and select this repository.
3. Render reads `render.yaml` and builds the Docker service.
4. In the service's **Environment** page, set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`.
5. Wait for deployment, then visit `/api/health` on the generated Render URL.

See [render-deploy.md](render-deploy.md) for details. Never commit real API keys.

## Before production use

Add authentication, session isolation, durable storage, rate limiting, audit logs, and isolated workspace sandboxes. The current implementation does not execute arbitrary terminal commands; the terminal panel is simulated.

## License

MIT for this project's original code. See [LICENSE](LICENSE). OpenCode is a separate project; review its upstream repository and license before copying or redistributing any upstream code.
