# Render deployment checklist

1. Open https://dashboard.render.com/.
2. Select **New + → Blueprint**.
3. Choose `RISHABH12005/Side-Hustle` and branch `feat/opencode-render`.
4. Deploy the Blueprint. Render reads `render.yaml` and builds the Docker service.
5. In the service's Environment page set `AI_API_KEY`, `AI_BASE_URL` (optional for OpenAI-compatible services), and `AI_MODEL`.
6. Wait for deploy, then verify `https://YOUR-SERVICE.onrender.com/api/health` returns `{ "ok": true, ... }`.
7. Open the root URL and try the AI Agent panel.

## Production checklist

Before allowing public users, add authentication, per-user workspace isolation, durable storage, rate limiting, audit logs, and isolated workspace sandboxes. Arbitrary terminal command execution and real Git operations are not implemented in this starter. Never commit real API keys.
