# pwnvader-cors-proxy

CORS proxy minimal en Cloudflare Workers, usado por el auditor de CMS de
[hacking.pwnvader.com](https://hacking.pwnvader.com).

## Deploy

```bash
cd worker
npm install
npx wrangler login          # primera vez
npx wrangler deploy
```

Después de desplegar, anota la URL devuelta (algo como
`https://pwnvader-cors-proxy.<tu-cuenta>.workers.dev`) y configúrala en
el front (variable de entorno `VITE_WORKER_URL` o `localStorage`).

## Endpoints

- `GET /?url=<target>` — proxy GET. Devuelve JSON con status/headers/body.
- `GET /?url=<target>&method=HEAD` — solo headers.
- `GET /health` — health check.

## Seguridad

- Solo `GET`/`HEAD`/`OPTIONS` aceptados.
- Bloquea hosts internos / metadata clouds (127.0.0.1, 169.254.169.254, RFC1918, etc.).
- `Access-Control-Allow-Origin` restringido a `ALLOWED_ORIGINS` (configurable en `wrangler.toml`).
- Body truncado a `MAX_BODY_BYTES` (512 KiB por defecto).
- Timeout de `TIMEOUT_MS` (10 s por defecto).
