# Render deployment checklist

1. Open https://dashboard.render.com/.
2. Select **New + → Blueprint**.
3. Connect GitHub if requested and choose `RISHABH12005/Side-Hustle`.
4. Deploy the Blueprint from branch `feat/opencode-render` initially. Merge to `main` when ready to use the default production branch.
5. Open the service's **Environment** page and set:
   - `AI_API_KEY` — provider secret
   - `AI_BASE_URL` — provider's OpenAI-compatible base URL (optional for OpenAI)
   - `AI_MODEL` — exact model name supported by your provider
6. Trigger a deploy after saving environment changes.
7. Verify `https://YOUR-SERVICE.onrender.com/api/health` returns JSON with `ok: true`.
8. Open the root URL and try a prompt from the AI Agent panel.

## Service details

- Runtime: Docker
- Health check: `/api/health`
- Internal port: `3000`
- Build and install steps are defined in `Dockerfile`.

## Before production use

Add user authentication, session isolation, durable storage, per-user API key handling or billing, rate limiting, audit logs, and isolated workspace sandboxes. The current implementation does not execute arbitrary terminal commands; the terminal tab is explanatory and simulated.
