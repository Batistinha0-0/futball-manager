# Futball Manager — Web

React (JavaScript) + Vite, **mobile-first**, product copy in **`src/strings/pt-BR.js`**.

## Responsive layout and CSS

Global styles live in **`src/index.css`**. The shell uses **CSS Grid** (`#root`, `.fm-layout`, `.fm-layout__main`) with fluid **`:root` tokens** (`clamp()`, `rem`, `ch`, `vw`, `min()` / `max()`). Page content that should form a responsive card grid (for example the home screen) is wrapped in **`.fm-page-grid`** (one column by default, two columns from `48rem` viewport width). App UI styles avoid **fixed pixel lengths** in property values; after changes, you can confirm with `rg px src` from `frontend/` (expect no matches in UI CSS or JSX).

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

## Deploy no Render (site estático)

1. **Root Directory:** `frontend` (monorepo).
2. **Build command:** `npm install && npm run build`
3. **Publish directory:** `dist`
4. **SPA (obrigatório):** no painel do site estático, abra **Redirects / Rewrites** e adicione uma regra **Rewrite**:
   - **Source:** `/*`
   - **Destination:** `/index.html`  
   Sem isto, rotas como `/elenco` devolvem 404 do CDN (página sem o bundle React/CSS — o site parece “sem estilização”).

O `vite.config.js` usa `base: './'` para os ficheiros em `dist/assets/` carregarem com URLs relativas ao `index.html`.
