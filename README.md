# Futball Manager

Site **mobile-first** para organizar e gerenciar um grupo de futebol que joga **todo domingo, às 8h30**.

O objetivo é centralizar o cadastro de jogadores, avaliar o nível de cada um, montar a lista do dia e **sortear times equilibrados**, respeitando o histórico para não repetir combinações iguais (ou muito parecidas) semana após semana.

---

## Brasil e idioma (PT-BR)

A aplicação é **brasileira**: toda a experiência voltada ao utilizador deve estar em **português do Brasil (pt-BR)**, sem mistura com outros idiomas na interface nem em mensagens de sistema.

Inclui, obrigatoriamente:

- **Interface:** rótulos, botões, títulos, placeholders, estados vazios, textos de ajuda e onboarding.
- **Feedback:** mensagens de validação, erros, confirmações e toasts.
- **Comunicações futuras** (SMS, WhatsApp, e-mail, push): redação em **PT-BR**.
- **Locale de apresentação:** datas e horas no **padrão brasileiro** (ex.: dia/mês/ano; hora coerente com o uso local — o grupo joga às 8h30 no fuso em que o produto for configurado, tipicamente **Brasil**).
- **Números na UI:** quando exibidos como texto (ex.: estatísticas), seguir convenção **pt-BR** (ex.: separador decimal com vírgula, se aplicável).
- **Documentação para o organizador** (textos dentro do app, não necessariamente o README técnico do repositório): **PT-BR**.

**Código vs produto:** tudo o que for **implementação** — nomes de **pastas e arquivos**, **funções**, **variáveis**, **tipos**, **rotas/API internas**, **commits** e comentários no repositório — deve estar em **inglês**. O **aplicativo em si** comporta-se como um produto **brasileiro**: cópias, fluxos e mensagens ao utilizador em **pt-BR**, com locale **`pt-BR`**, sem misturar inglês na interface. Cadeias mostradas ao utilizador vivem em catálogos de texto (ex.: `pt-BR.json` / `pt-BR.ts`); o domínio pode expor **códigos de erro em inglês** (ex.: `STARS_OUT_OF_RANGE`) mapeados para texto em **pt-BR** na UI. Detalhes em [`docs/estrutura-codigo.md`](docs/estrutura-codigo.md).

---

## Problema que resolve

- Saber **quem joga** em cada domingo.
- Manter uma **base de jogadores** (ativos e que já jogaram).
- Ter **habilidade**, **perfil** e opcionalmente **posição** para balancear os times.
- Lidar com **número variável de jogadores e de times** (nem sempre dá para jogar com o formato ideal às 8h30).
- **Sortear times** de forma justa: habilidade equilibrada, sem times muito parecidos ao domingo anterior, e regras claras para **goleiro inicial** quando não há fixo na baliza.

---

## Quem pode usar (acesso)

- Apenas **organizadores** acedem à aplicação.
- Só eles podem: marcar **quem veio** / **quem compareceu**, gerir a **base de jogadores**, editar **notas (estrelas)** e **dados do perfil**, configurar o **domingo** e **sortear times**.

Isto simplifica permissões, segurança e uso no dia a dia.

---

## Formato do jogo (flexível)

O número de times e de jogadores por time **não é fixo**; depende de quanta gente aparece.

| Situação típica         | Descrição                                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ideal**               | Cada time com **6 jogadores**, **incluindo 1 goleiro** (5 na linha + goleiro).                                                                                                                                         |
| **Menos gente às 8h30** | Pode jogar-se com **5 por time**: **1 goleiro + 4 na linha**; à medida que **vão chegando**, os jogadores **completam** os times (o produto deve permitir ajustar a sessão depois do primeiro sorteio, se necessário). |

**Requisito de produto:** na configuração de cada **domingo / sessão**, deve ser possível definir (ou ajustar) coisas como: quantos times, quantos jogadores por time alvo, e se a sessão começou “incompleta” com vista a completar mais tarde.

---

## Cadastro do jogador (campos obrigatórios e opcionais)

Ao cadastrar (ou manter) um jogador na base, preenche-se obrigatoriamente:

| Campo          | Descrição                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **Habilidade** | Estrelas de **0 a 5**, com incrementos de **meia estrela** (ex.: 2,5 ★). Usada no balanceamento dos times. |
| **Perfil**     | Uma de: **ataque**, **defesa** ou **misto**. O sorteio usa isto para compor a linha de forma coerente.     |

**Posição** (ex.: zagueiro, lateral, meia) é **opcional**. Se estiver preenchida, o algoritmo de sorteio deve **levar em consideração** como preferência / encaixe, sem impedir soluções quando faltar gente ou posições.

A **base** pode ser configurada: ativar/desativar jogadores, editar dados, remover do grupo quando fizer sentido.

---

## Domingo — lista do dia

- Escolher **quais jogadores da base** participam **naquele** domingo (presença / convocados).
- Lista do dia é independente do cadastro geral: nem toda a base joga todas as semanas.

---

## Goleiro: fixo, ausente e revezamento no campo

### Cenários

1. **Há goleiro(es) de facto naquele dia**  
   Jogadores identificados como aptos ou preferência para a baliza; o sorteio pode **atribuir 1 goleiro por time** entre eles.

2. **Não há goleiro fixo**  
   Qualquer um pode ir à baliza; os jogadores **revezam** durante o jogo.

### Regra no campo (fora da app)

O revezamento na baliza **não é cronometrado pela app**: é **por gol**.

- **Quem está na baliza e sofre um gol, troca** com outro jogador do mesmo time (regra combinada no campo).
- Isto é **dinâmico** e **não precisa de registo gol a gol** na primeira versão do produto, salvo evolução futura.

### O que a app deve garantir: **goleiro inicial**

Mesmo com revezamento por gol no decorrer do jogo, é preciso saber **quem começa na baliza** em cada time.

- A aplicação deve indicar, para cada time sorteado, o **goleiro inicial** (sugestão ou atribuição clara na lista publicada).
- Critério sugerido quando não há fixo: favorecer quem **menos** começou como goleiro nas últimas sessões ou rodízio simples entre os que aceitam ir à baliza — o detalhe fica para a implementação, mas a **regra de negócio** é: **sempre haver um goleiro inicial por time**, alinhado ao formato do dia (6 com GK, ou 5 com 1 na baliza, etc.).

### Balanceamento

Quando alguém forte vai à baliza no início, pode distorcer a “força da linha”. Opcionalmente, o sorteio pode tratar o **goleiro inicial** como papel separado e equilibrar sobretudo os **jogadores de linha** por estrelas/perfil; isso evita times visualmente equilibrados em papel mas desiguais na prática.

---

## Sorteio de times

- Dividir os presentes em **dois (ou mais) times**, conforme a configuração **daquele** domingo.
- Usar **estrelas**, **perfil** e **posição** (se existir) como entrada do algoritmo.

Critérios de produto (prioridade sugerida: primeiro **equilíbrio de habilidade** dentro de um limiar aceitável, depois **diversidade** face ao histórico):

| Critério                 | Descrição                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **Habilidade**           | Evitar times **muito desequilibrados** em estrelas (somatório ou média o mais próximo possível entre times).                  |
| **Histórico / variação** | Evitar sortear times **muito parecidos** aos do **domingo anterior** (mesmo conjunto ou quase o mesmo elenco num mesmo time). |
| **Perfil e posição**     | Respeitar perfil obrigatório; usar posição opcional quando preenchida.                                                        |

A métrica exacta de “time parecido” (ex.: sobreposição de conjuntos, distância entre formações) fica para a implementação, mas o comportamento desejado está acima.

---

## Evolução do produto (roadmap em alto nível)

1. **Primeiro:** fluxo simples — base, domingo, presenças, sorteio, lista com **goleiro inicial** e times.
2. **Depois:** tornar mais dinâmico — por exemplo **enviar** a lista sorteada para o **número** associado ao perfil de cada jogador, para reduzir ambiguidade e **evitar múltiplos re-sorteios** sem necessidade.

---

## Público e plataforma

- **Público-alvo:** organizadores de um grupo no **Brasil**; produto e cópias em **PT-BR** (ver [Brasil e idioma (PT-BR)](#brasil-e-idioma-pt-br)).
- **Mobile-first**: uso no celular antes e depois do jogo.
- Pode evoluir para PWA ou app nativo conforme a stack.
- **HTML:** `lang="pt-BR"` no documento raiz da aplicação.

---

## Stack e monorepo

O código está organizado em **dois pacotes independentes** na raiz do repositório (backend e frontend evoluem à parte; deploys também podem ser separados):

| Pasta           | Tecnologia                         | Notas                                                                                                                                                  |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`backend/`**  | Python 3.11+, **FastAPI**, Uvicorn | API REST, camadas SOLID. **PostgreSQL** (SQLAlchemy + **Alembic**). **Docker** só aqui: [`Dockerfile`](backend/Dockerfile), [`docker-compose.yml`](backend/docker-compose.yml). Sem `DATABASE_URL` → **memória** (testes). |
| **`frontend/`** | **React** (JavaScript) + **Vite**  | Mobile-first, **Atomic Design**; sem Docker no repositório. Variáveis em [`frontend/.env.example`](frontend/.env.example).                          |

Pré-requisitos: **Python 3.11+**, **Node.js 20+** (recomendado). Para Postgres local com Docker: **Docker Desktop** (ou engine compatível).

### Docker Compose (PostgreSQL + API) — só no `backend/`

Toda a stack Docker está em [`backend/docker-compose.yml`](backend/docker-compose.yml). Corre **a partir da pasta `backend/`**:

```bash
cd backend
docker compose up --build
```

- **Postgres:** `localhost:5432`, utilizador / base / palavra-passe por defeito `futball` (ajusta em `docker-compose.yml` ou em `backend/.env`; se mudares o utilizador, atualiza o `healthcheck` do serviço `db`).
- **API:** `http://127.0.0.1:8000` com `DATABASE_URL` para o serviço `db` (valor por defeito já definido no compose).

Opcional: copia [`backend/.env.example`](backend/.env.example) para `backend/.env` e ajusta; o Compose lê `.env` no **mesmo directório** que o ficheiro `docker-compose.yml` ([documentação](https://docs.docker.com/compose/environment-variables/)).

Migrações **Alembic** correm automaticamente no arranque da API quando `DATABASE_URL` está definida.

#### Erro `500 Internal Server Error` ao fazer pull da imagem (Docker Desktop no Windows)

Mensagens com `dockerDesktopLinuxEngine` e falha ao criar/pull `postgres:16-alpine` vêm do **motor Docker**, não do projeto. Tenta por esta ordem:

1. Confirma que o **Docker Desktop** está aberto e com o estado “running” (ícone da baleia sem erro).
2. **Reinicia o Docker Desktop** (Quit completamente e volta a abrir).
3. No PowerShell: `wsl --shutdown`, abre de novo o Docker Desktop e espera até ficar pronto.
4. Testa o pull isolado: `docker pull postgres:16-alpine`. Se também falhar, é rede/registry ou instalação Docker — atualiza o **Docker Desktop** para a versão mais recente.
5. VPN, proxy corporativo ou antivírus às vezes bloqueiam o registo; desliga temporariamente para testar.

#### Build da API: `SSLCertVerificationError` / `self-signed certificate in certificate chain` ao instalar do PyPI

Isto acontece **dentro do build Docker** quando a rede inspeciona HTTPS (proxy corporativo, etc.) e o Python não confia na cadeia de certificados até ao PyPI.

1. **Recomendado:** instalar o **certificado raiz da empresa** na imagem (ou pedir à TI a exceção para `pypi.org`) — é a solução correta a longo prazo.
2. **Workaround do projeto:** em `backend/.env`, define `PIP_TRUSTED_HOSTS=1` e volta a construir **a partir de `backend/`**:

   ```bash
   cd backend
   docker compose build --no-cache api
   docker compose up
   ```

   Isto passa `--trusted-host` ao `pip` **só durante o build** (por defeito fica desligado, para não afetar builds em ambientes limpos como o Render).

3. Alternativa pontual: `docker compose build --build-arg PIP_TRUSTED_HOSTS=1 api` (com `cd backend` antes, ou `-f backend/docker-compose.yml` a partir da raiz).

### Render + Neon (produção simples)

1. Cria um projeto em [**Neon**](https://neon.tech) e uma base **PostgreSQL**; copia a **connection string** (começa por `postgresql://`).
2. Para o SQLAlchemy + **psycopg** v3, troca o esquema para **`postgresql+psycopg://`** (mantém o resto da URL, incluindo `?sslmode=require` se existir).
3. No [**Render**](https://render.com), cria um **Web Service** com **Docker** e aponta:
   - **Dockerfile path:** `backend/Dockerfile`
   - **Docker build context:** `backend` (directório `backend/` na raiz do repo)
4. Define variáveis de ambiente no Render:
   - **`DATABASE_URL`** — string do passo 2 (marca como segredo).
   - **`CORS_ORIGINS`** — URL do teu frontend em produção (várias origens separadas por vírgula).

Podes usar o blueprint [`render.yaml`](render.yaml) como ponto de partida (**New → Blueprint** no Render) e depois preencher `DATABASE_URL` e `CORS_ORIGINS` no painel.

### Como rodar em desenvolvimento

1. **Backend** (porta padrão `8000`), **sem** Docker — só memória (útil para testes rápidos):

   ```bash
   cd backend
   pip install -e ".[dev]"
   uvicorn app.main:app --reload
   ```

   Usa o **ambiente Python** que já tiveres (o projeto **não** assume `venv`).

   Para usar o **Postgres do Compose** a partir do host (sem subir o serviço `api` no Docker), define no `backend/.env`:

   ```env
   DATABASE_URL=postgresql+psycopg://futball:futball@127.0.0.1:5432/futball
   ```

   Com o Postgres a correr (`cd backend` e `docker compose up db` ou stack completa), ao arrancar o Uvicorn as migrações aplicam-se automaticamente.

2. **Frontend** (porta padrão `5173`):

   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

   No Windows, podes usar `copy .env.example .env` em vez de `cp`.

   Defina `VITE_API_URL=http://127.0.0.1:8000` no `.env` para o health check e chamadas à API.

O backend expõe **CORS** para `http://localhost:5173`. Documentação interativa: `http://127.0.0.1:8000/docs`.

Estrutura detalhada de pastas e convenções: [`docs/estrutura-codigo.md`](docs/estrutura-codigo.md). Convenções Atomic no [`frontend/README.md`](frontend/README.md).

---

## Glossário rápido

| Termo                 | Significado                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Base de jogadores** | Todos cadastrados no grupo, com estrelas, perfil e posição opcional.                                   |
| **Lista do domingo**  | Subconjunto da base que participa **naquele** domingo.                                                 |
| **Sessão / rodada**   | Um domingo de jogo: configuração (tamanhos dos times), presenças, times sorteados e goleiros iniciais. |
| **Goleiro inicial**   | Quem começa na baliza naquele time; a app define ou sugere; o revezamento por gol é no campo.          |

---

## Próximos passos sugeridos

1. Completar modelo (organizadores, sessões, sorteio) e **CRUD** em cima do Postgres, com validações (estrelas, perfil, posição opcional).
2. Modelar entidades no **código** (nomes em inglês): `Organizer`, `SundaySession`, `Attendance`, `Team`, `TeamHistory`, papéis de **goleiro inicial**; na **UI**, rótulos em **pt-BR** (ex.: “Jogador”, “Sessão de domingo”).
3. Implementar fluxo “domingo → presenças → configuração flexível → sorteio” com critérios de equilíbrio e histórico.
4. Implementar regras de **goleiro inicial** (com vs sem goleiro fixo) e documentar na UI a regra de **troca por gol** como texto informativo para o grupo.

---

## Licença

A definir pelo autor do repositório.
