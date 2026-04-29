# Futball Manager — Web

React (JavaScript) + Vite, **mobile-first**, product copy in **`src/strings/pt-BR.js`**.

## Atomic Design

Import only **down** the hierarchy:

`pages` → `templates` → `organisms` → `molecules` → `atoms`

- **atoms** — smallest UI pieces (button, text, input).
- **molecules** — simple groups (label + field).
- **organisms** — sections (header).
- **templates** — page shells / layout.
- **pages** — screens wired to hooks and strings.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` must match your API (default `http://127.0.0.1:8000`). Optional: Vite proxies `/api` to the same host for same-origin calls.
