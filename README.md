# hacking.pwnvader.com

Herramientas de ciberseguridad serverless. Hermano técnico de [pwnvader.com](https://pwnvader.com).

Todo corre en el navegador (React + Vite, build estático en GitHub Pages). Lo único que sale del cliente son las requests del auditor de CMS, que pasan por un Cloudflare Worker propio (carpeta `worker/`).

## Secciones

- **Networking** — calculadora de subnetting IPv4 y generador de reverse shells multi-lenguaje.
- **CMS Audit** — auditor pasivo de WordPress (cabeceras, endpoints, enumeración, versión, score propio). Próximamente Joomla y Drupal.
- **Encoders** — recetas estilo CyberChef (Base64, URL, Hex, ROT, hashes, JWT) y feature distintiva: ocultar mensajes invisibles dentro de un emoji vía Unicode tag chars.

Atajo: `~` (o `Ctrl+\``) abre un shell flotante en cualquier página para navegar con comandos (`cd networking`, `open wp`, etc.).

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/
npm run preview      # sirve dist/ localmente
npm run typecheck    # tsc sin emit
```

## Deploy

GitHub Actions builda y publica a Pages en cada push a `main` (workflow en `.github/workflows/deploy.yml`).

Requisitos en el repo:
1. **Settings → Pages → Source:** _GitHub Actions_.
2. **Settings → Pages → Custom domain:** `hacking.pwnvader.com` (CNAME ya en `public/`).
3. DNS del subdominio apuntando a `pwnvader.github.io` (CNAME en tu DNS provider).

### Cloudflare Worker (auditor CMS)

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

Anota la URL devuelta y pégala en la UI del auditor (input "URL del Cloudflare Worker"). Se guarda en localStorage. Alternativa: build con `VITE_WORKER_URL=https://...` y queda hardcoded como default.

## Stack

- Vite + React 18 + TypeScript + Tailwind CSS
- react-router-dom (BrowserRouter, fallback `404.html` para SPA en Pages)
- Cloudflare Workers (proxy CORS, opcional, solo para CMS Audit)

## Privacidad

- Sin tracking, sin cookies, sin analytics.
- Toda la configuración se guarda en `localStorage` (clic derecho → inspeccionar para auditar).
- El auditor de CMS pasa por el Worker pero el Worker no almacena nada (su única persistencia es opcional para rate limiting, y por ahora ni eso).

## Uso ético

Auditoría exclusivamente sobre sistemas propios o con permiso escrito. Los payloads de reverse shell y el auditor de WordPress no son juguetes: el acceso no autorizado es delito.

## Autor

[pwnVader](https://pwnvader.com) · Jesús Pérez Romero.
