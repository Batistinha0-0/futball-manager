# Estrutura do código — Futball Manager

Este documento define **como organizar o repositório** para o produto descrito no [README](../README.md): mobile-first, só organizadores, base de jogadores, sessões de domingo flexíveis, sorteio com histórico e goleiro inicial.

## Stack atual (monorepo)

| Pacote | Tecnologia | Pastas principais |
| ------ | ---------- | ------------------ |
| **Backend** | Python 3.11+, **FastAPI**, Uvicorn, **PostgreSQL** (SQLAlchemy + Alembic) | [`backend/app/`](../backend/app/) — `domain/`, `application/`, `ports/`, `infrastructure/`, `api/`; [`docker-compose.yml`](../backend/docker-compose.yml) sobe **só Postgres**; API em local ou imagem [`Dockerfile`](../backend/Dockerfile) no deploy |
| **Frontend** | **React** (JavaScript) + **Vite** | [`frontend/src/`](../frontend/src/) — `components/` (Atomic Design), `hooks/`, `services/`, `strings/pt-BR.js` |

A estrutura prioriza **fronteiras claras** entre domínio, casos de uso, dados e interface; o backend segue **SOLID** (Protocol + injeção via `Depends`); o front segue **Atomic Design** (ver [`frontend/README.md`](../frontend/README.md)).

**Idioma:** ver [Convenções de idioma](#convenções-de-idioma-código-em-inglês-app-em-pt-br) — **inglês** no código; **pt-BR** na experiência do usuário.

---

## Princípios

1. **Domínio puro** — regras de negócio (estrelas, perfis, validação de sessão, lógica de sorteio, “time parecido”) em módulos **sem** dependência de framework UI nem de HTTP/SDK concretos.
2. **Casos de uso explícitos** — cada fluxo relevante é uma função ou módulo pequeno em **inglês** (ex.: `createPlayer`, `setSessionAttendance`, `runDraw`) que orquestra domínio + persistência através de **portas** (interfaces).
3. **Persistência atrás de adaptadores** — o domínio não sabe se os dados vêm de IndexedDB, Supabase ou API; só conhece repositórios / gateways definidos por você.
4. **UI fina** — páginas e componentes apenas coletam entrada, chamam casos de uso e mostram estado; **sem** duplicar regras de sorteio ou validação de jogador nas telas.
5. **Sorteio testável** — algoritmo de formação de times e goleiro inicial com **entrada/saída bem definidas** (Pydantic / tipos no domínio) e testes unitários **sem** base de dados real.
6. **Produto em pt-BR** — tudo o que o usuário **lê** na app está em **português do Brasil**; formatação de data/número com locale **`pt-BR`**.

---

## Convenções de idioma (código em inglês, app em pt-BR)

| O quê | Idioma |
| ----- | ------ |
| Pastas, arquivos, módulos | **Inglês** (`player/`, `run_draw.py`, `HomePage.jsx`) |
| Funções, variáveis, tipos, enums de código | **Inglês** (`starting_goalkeeper`, `DrawInput`) |
| Rotas HTTP internas, handlers, tabelas/colunas em código | **Inglês** (ex.: `/api/sessions`, `player_id`) |
| Commits e comentários no código | **Inglês** (recomendado) |
| Textos na interface, toasts, validação visível, e-mails/SMS | **pt-BR** (catálogo dedicado) |
| Códigos de erro para a UI mapear | **Inglês** estável (ex.: `STARS_OUT_OF_RANGE`) → mensagem **pt-BR** no mapa de strings |

O repositório pode ter documentação em português (como este arquivo); o **código-fonte** segue **inglês** de ponta a ponta, e o **comportamento do produto** é o de uma app **brasileira** (`lang="pt-BR"`, `Intl` `pt-BR`, cópias só em pt-BR).

---

## Locale e textos (pt-BR) — só na camada de produto

- **`lang="pt-BR"`** no HTML raiz da aplicação.
- **Cadeias de UI:** [`frontend/src/strings/pt-BR.js`](../frontend/src/strings/pt-BR.js) (ou JSON equivalente). O **nome do arquivo** pode incluir `pt-BR`; o **conteúdo** é português do Brasil. Biblioteca i18n opcional com **locale padrão `pt-BR`**.
- **Domínio:** preferir devolver **códigos** em inglês (`STARS_OUT_OF_RANGE`) e traduzir na UI; evita mensagens em inglês na tela e mantém o domínio sem literais em português espalhados.
- **`Intl`:** `Intl.DateTimeFormat('pt-BR')`, `Intl.NumberFormat('pt-BR')`, etc.
- **Testes:** asserts sobre texto apresentado esperam **pt-BR**; testes de domínio podem usar códigos em inglês.

Isso cumpre o README: **código em inglês**, **app estruturada como produto em português do Brasil**.

---

## Visão em camadas

```text
┌─────────────────────────────────────┐
│  UI (routes, components, hooks)     │
├─────────────────────────────────────┤
│  Application (use cases)            │  ← orchestration
├─────────────────────────────────────┤
│  Domain (entities, policies, draw)  │
├─────────────────────────────────────┤
│  Infrastructure (DB, auth, SMS)     │
└─────────────────────────────────────┘
```

Fluxo de dependência: **UI → aplicação → domínio**; **infra implementa interfaces** consumidas pela aplicação.

---

## Árvore de pastas (implementação atual)

### Backend (`backend/`)

```text
backend/
├── pyproject.toml
├── app/
│   ├── main.py                 # FastAPI app, CORS, routers
│   ├── core/config.py          # Settings (env)
│   ├── api/
│   │   ├── deps.py             # DI: repositories → services
│   │   └── routes/             # thin HTTP: health, players, …
│   ├── domain/                 # entities, domain errors (no FastAPI imports)
│   ├── application/            # use cases / services per aggregate
│   ├── ports/                  # typing.Protocol repositories
│   └── infrastructure/         # Memory / SQL implementations
└── tests/
```

**Regra:** módulos em `app/domain/` **não importam** rotas nem infraestrutura concreta.

### Frontend (`frontend/`)

```text
frontend/
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── strings/pt-BR.js        # copy shown to users (pt-BR)
│   ├── services/apiClient.js
│   ├── hooks/
│   └── components/
│       ├── atoms/
│       ├── molecules/
│       ├── organisms/
│       ├── templates/
│       └── pages/
```

### Referência histórica (monólito TypeScript)

Havia um exemplo de **uma única pasta `src/`** em TypeScript/React (arquivos `.ts` / `.tsx`). Foi **substituído** por este monorepo **Python + React JS**. Os **princípios** (domínio, portas, inglês no código, pt-BR na UI) mantêm-se; apenas mudam extensões e a divisão em dois pacotes.

---

## Mapeamento requisito → módulo

| Área no README | Onde vive no código (nomes em inglês) |
| ---------------- | ------------------- |
| Campos jogador (estrelas, perfil, posição) | `backend/app/domain/player.py` (+ futura validação) + serviços em `application/players/` |
| Sessão flexível (times, jogadores/time) | futuro `domain/session.py` + `application/sessions/` |
| Presenças do domingo | futuro `domain/` + `application/sessions/` |
| Sorteio + histórico + equilíbrio | futuro `backend/app/domain/draw/` |
| Goleiro inicial | futuro `starting_goalkeeper.py` ou parte do motor de sorteio |
| Só organizadores | futuro `application/auth/` + dependência FastAPI / middleware |
| Persistência | `backend/app/ports/` + `infrastructure/persistence/` |
| Textos e layout mobile-first | `frontend/src/strings/pt-BR.js` + `frontend/src/components/` |

---

## Contratos importantes

### Draw input

Define a main input type (e.g. `DrawInput`) with:

- list of **attending player IDs** (or loaded entities);
- **session config** (team count, target roster size, incomplete flags, designated goalkeepers flag);
- **history** from last matchday (or N): player sets per team and, if useful, starting goalkeepers;
- optional **seed** (reproducible draw in tests or future audit).

### Draw output

- array of **teams**, each with **field players**, **starting goalkeeper**, UI metadata (e.g. line average stars);
- non-blocking **warnings** (user-facing strings come from the **pt-BR** catalog; codes in English e.g. `SIMILARITY_TO_LAST_WEEK_HIGH`).

### Repositories

Suggested interfaces:

- `PlayerRepository`: CRUD + list filters (active/inactive).
- `SessionRepository`: session by date or ID, attendance, persisted draw result.
- `TeamHistoryRepository`: past lineups for `similarity` helpers (e.g. `similarity.py`).

---

## Testes

| Tipo | Alvo |
| ---- | ---- |
| **Unitários** | `domain/draw/*`, `player` validation, metric helpers |
| **Integração** | `application/*` with **in-memory** repo implementations of `ports/` |
| **E2E** (opcional, mais tarde) | critical UI flows: organizer login → draw |

**Backend:** arquivos em `backend/tests/` (`test_*.py`). **Frontend:** testes (Vitest/RTL) podem seguir `*.test.jsx` junto aos componentes quando forem introduzidos.

---

## Configuração e constantes

- Magic values (e.g. star step `0.5`, max `5`, role enum) in **one place** (`backend/app/domain/constants.py` ou equivalente; rótulos **pt-BR** só em `frontend/src/strings/pt-BR.js`).
- **Feature flags** (e.g. SMS notifications) from env read in `infrastructure/` or app bootstrap.

---

## Evolução (fase 2)

- **Notifications:** novo adaptador em `infrastructure/notifications/` + caso de uso `send_draw_result_list.py` com o resultado persistido da sessão.
- **API já separada** do front; evoluções mantêm nomes em **inglês** no Python.

---

## Resumo

- **`domain/`** = verdade do negócio e algoritmo de sorteio (arquivos e símbolos em **inglês**).  
- **`application/`** = fluxos que os organizadores disparam (**inglês**).  
- **`ports/` + `infrastructure/`** = onde a base de dados e auth moram (**inglês**).  
- **`frontend/src/`** = mobile-first, sem lógica de negócio pesada; **cópias** só em **pt-BR** (`strings/pt-BR.js`).

Comandos para subir o ambiente: ver [README.md](../README.md) (seção **Stack e monorepo**).
