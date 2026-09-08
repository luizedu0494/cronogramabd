# CronoLab — Análise de Migração: Firebase → PostgreSQL + Nova Hospedagem

> Documento técnico completo elaborado a partir da análise do código-fonte do projeto.  
> Objetivo: propor uma **cópia paralela** do sistema com banco de dados relacional e infraestrutura moderna, **sem afetar o sistema Firebase em produção**.

---

## Sumário

1. [Situação Atual — Firebase](#1-situação-atual--firebase)  
2. [Por Que Migrar?](#2-por-que-migrar)  
3. [Mapeamento das Coleções Firestore → Tabelas PostgreSQL](#3-mapeamento-das-coleções-firestore--tabelas-postgresql)  
4. [Schema SQL Proposto](#4-schema-sql-proposto)  
5. [Autenticação — O Que Muda](#5-autenticação--o-que-muda)  
6. [Opções de Banco de Dados](#6-opções-de-banco-de-dados)  
7. [Opções de Hospedagem do Frontend](#7-opções-de-hospedagem-do-frontend)  
8. [Opções de Hospedagem do Backend / API](#8-opções-de-hospedagem-do-backend--api)  
9. [Stack Recomendada (Custo Zero)](#9-stack-recomendada-custo-zero)  
10. [Plano de Migração em Etapas](#10-plano-de-migração-em-etapas)  
11. [Script de Cópia Inicial (Firestore → PostgreSQL)](#11-script-de-cópia-inicial-firestore--postgresql)  
12. [O Que Muda no Código React](#12-o-que-muda-no-código-react)  
13. [Comparativo Firebase vs. Nova Stack](#13-comparativo-firebase-vs-nova-stack)  
14. [Riscos e Mitigações](#14-riscos-e-mitigações)  
15. [Checklist de Execução](#15-checklist-de-execução)

---

## 1. Situação Atual — Firebase

O CronoLab usa **três serviços Firebase** de forma integrada:

| Serviço | Uso no Sistema |
|---------|---------------|
| **Firestore** (NoSQL) | Todas as coleções: `aulas`, `users`, `eventosManutencao`, `avisos`, `revisoesTecnicos`, `grupos`, `logs`, `config` |
| **Firebase Auth** | Login com Google, controle de sessão, UID do usuário |
| **Firebase Hosting** | Hospedagem do frontend React (build estático) |

**Plano atual:** Spark (gratuito)  
**Limitações já sentidas:**
- Cloud Functions bloqueadas no plano Spark — o arquivo `functions/index.jsx` está comentado exatamente por isso
- API key Groq exposta no bundle de produção (problema de segurança documentado em `MELHORIAS_CRONOLAB.md`)
- Sem servidor próprio para lógica de backend
- Regras Firestore dependem de consultas ao banco a cada validação

---

## 2. Por Que Migrar?

### Problemas Técnicos Identificados no Código

1. **Sem backend real** — toda lógica de negócio (aprovações, conflitos de horário, designações) fica no frontend, exposta ao usuário
2. **Chave Groq exposta** — `VITE_GROQ_API_KEY` compilada no bundle JS público (descrito como P0 crítico no `MELHORIAS_CRONOLAB.md`)
3. **N+1 de leituras** — `PaginaInicial.jsx` abre um `onSnapshot` e faz um `getDoc` por aviso para checar leitura
4. **Queries limitadas** — Firestore não suporta `OR` entre campos diferentes; filtros avançados de `GerenciarAulasAvancado.jsx` fazem filtragem local após busca ampla
5. **Sem transações robustas** — operações de aprovação/rejeição usam `updateDoc` simples, sem garantia ACID
6. **Sem full-text search** — busca por assunto usa `>=` e `<=` de string (hack para prefix match)

### Vantagens de PostgreSQL + Backend Próprio

- SQL com `JOIN`, `GROUP BY`, `FULL TEXT SEARCH` nativo
- Transações ACID reais para aprovações e conflitos
- API REST/GraphQL própria → chaves secretas ficam no servidor
- Custo previsível (ou zero nos planos gratuitos)
- Capacidade de rodar Cloud Functions / cron jobs sem upgrade de plano

---

## 3. Mapeamento das Coleções Firestore → Tabelas PostgreSQL

A seguir, cada coleção Firestore identificada no código e sua equivalente relacional.

### Coleção `users`

Campos encontrados em `App.jsx`, `GerenciarUsuarios`, `DesignarTecnicosModal`:

```
uid (string — Firebase UID)
name (string)
email (string)
role (string: 'coordenador' | 'tecnico' | null)
approvalPending (boolean)
status (string: 'aprovado' | 'pendente')
photoURL (string | null)
createdAt (timestamp)
telegramChatId (string | null)
avisosNaoLidos (integer)
```

### Coleção `aulas`

Campos encontrados em `ProporAulaForm`, `GerenciarAprovacoes`, `CalendarioCronograma`, `AnaliseEstatisticas`:

```
id (auto)
assunto (string)
tipoAtividade (string)
laboratorioSelecionado (string)
horarioSlotString (string — ex: "07:00-09:10")
dataInicio (timestamp)
dataFim (timestamp)
status (string: 'pendente' | 'aprovada' | 'rejeitada')
cursos (array de strings)
propostoPorUid (string → FK users)
propostoPorNome (string — denormalizado)
tecnicos (array de UIDs)
tecnicosInfo (array de objetos {uid, name})
tecnicosNomes (array de strings)
isRevisao (boolean)
tipoRevisaoLabel (string | null)
liga (string | null)
observacoes (string | null)
origem (string: 'manual' | 'ia' | 'importacao')
createdAt (timestamp)
```

### Coleção `eventosManutencao`

Campos em `EventosManutencao.jsx`, `GerenciarEventosAvancado.jsx`:

```
id (auto)
titulo (string)
descricao (string)
tipo (string: 'Manutenção' | 'Feriado' | 'Evento' | 'Giro' | 'Outro')
laboratorio (string — 'Todos' ou nome específico)
laboratorios (array — múltiplos labs)
dataInicio (timestamp)
dataFim (timestamp)
horarioSlotString (string)
status (string: 'aprovado' | 'pendente' | 'cancelado')
criadoPorUid (string → FK users)
criadoPorNome (string)
criadoEm (timestamp)
atualizadoEm (timestamp)
```

### Coleção `avisos`

Campos em `PainelAvisos.jsx`, `GerenciarAvisos.jsx`:

```
id (auto)
titulo (string)
conteudo (string)
tipo (string: 'normal' | 'importante' | 'urgente')
criadoPorUid (string → FK users)
criadoEm (timestamp)
— subcoleção leituras/{userId}
```

### Coleção `revisoesTecnicos`

Campos em `CalendarioRevisoesTecnico.jsx`:

```
id (auto)
tecnicoUid (string → FK users)
assunto (string)
tipo (string)
dataInicio (timestamp)
dataFim (timestamp)
status (string: 'planejada' | 'confirmada' | 'realizada' | 'cancelada')
observacoes (string)
createdAt (timestamp)
```

### Coleção `grupos`

Campos em `GerenciarGrupos.jsx`, `DesignarTecnicosModal.jsx`:

```
id (auto)
nome (string)
membros (array de {uid, name})
```

### Coleção `logs`

Campos em `GerenciarAulasAvancado.jsx`, `loggerService`:

```
id (auto)
type (string: 'exclusao' | 'edicao' | 'criacao' | 'aprovacao')
collection (string)
aula (objeto JSON)
timestamp (timestamp)
user_uid (string)
user_nome (string)
```

### Coleção `config`

Usada para configurações globais do sistema:

```
id (auto)
chave (string — unique)
valor (jsonb)
atualizadoEm (timestamp)
```

---

## 4. Schema SQL Proposto

```sql
-- =========================================================
-- CronoLab — Schema PostgreSQL
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Usuários ─────────────────────────────────────────────
CREATE TABLE users (
    uid           TEXT PRIMARY KEY,          -- mesmo UID do Firebase Auth (migração sem recriar contas)
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    role          TEXT CHECK (role IN ('coordenador', 'tecnico')) DEFAULT NULL,
    status        TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    approval_pending BOOLEAN NOT NULL DEFAULT TRUE,
    photo_url     TEXT,
    telegram_chat_id TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Laboratórios ──────────────────────────────────────────
-- (constantes no frontend hoje; centralizar aqui permite CRUD)
CREATE TABLE laboratorios (
    id     SERIAL PRIMARY KEY,
    name   TEXT NOT NULL UNIQUE,
    tipo   TEXT NOT NULL,
    ativo  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Cursos ────────────────────────────────────────────────
CREATE TABLE cursos (
    id    SERIAL PRIMARY KEY,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL
);

-- ── Aulas ─────────────────────────────────────────────────
CREATE TABLE aulas (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assunto               TEXT NOT NULL,
    tipo_atividade        TEXT NOT NULL DEFAULT 'aula',
    laboratorio           TEXT NOT NULL REFERENCES laboratorios(name),
    horario_slot          TEXT NOT NULL,       -- "07:00-09:10"
    data_inicio           TIMESTAMPTZ NOT NULL,
    data_fim              TIMESTAMPTZ NOT NULL,
    status                TEXT NOT NULL DEFAULT 'pendente'
                          CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
    proposto_por_uid      TEXT REFERENCES users(uid),
    proposto_por_nome     TEXT,
    is_revisao            BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_revisao_label    TEXT,
    liga                  TEXT,
    observacoes           TEXT,
    origem                TEXT DEFAULT 'manual'
                          CHECK (origem IN ('manual', 'ia', 'importacao')),
    firestore_id          TEXT UNIQUE,         -- ID original do Firestore (migração)
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cursos de cada aula (relação N:N)
CREATE TABLE aula_cursos (
    aula_id    UUID REFERENCES aulas(id) ON DELETE CASCADE,
    curso      TEXT NOT NULL,
    PRIMARY KEY (aula_id, curso)
);

-- Técnicos designados por aula (relação N:N)
CREATE TABLE aula_tecnicos (
    aula_id     UUID REFERENCES aulas(id) ON DELETE CASCADE,
    tecnico_uid TEXT REFERENCES users(uid),
    PRIMARY KEY (aula_id, tecnico_uid)
);

-- ── Eventos de Manutenção ─────────────────────────────────
CREATE TABLE eventos_manutencao (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT NOT NULL,
    descricao       TEXT,
    tipo            TEXT NOT NULL DEFAULT 'Manutenção'
                    CHECK (tipo IN ('Manutenção', 'Feriado', 'Evento', 'Giro', 'Outro')),
    status          TEXT NOT NULL DEFAULT 'aprovado'
                    CHECK (status IN ('aprovado', 'pendente', 'cancelado')),
    laboratorio     TEXT,                      -- NULL = todos
    horario_slot    TEXT,
    data_inicio     TIMESTAMPTZ NOT NULL,
    data_fim        TIMESTAMPTZ NOT NULL,
    criado_por_uid  TEXT REFERENCES users(uid),
    criado_por_nome TEXT,
    firestore_id    TEXT UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Labs do evento (quando não é "Todos")
CREATE TABLE evento_laboratorios (
    evento_id      UUID REFERENCES eventos_manutencao(id) ON DELETE CASCADE,
    laboratorio    TEXT NOT NULL,
    PRIMARY KEY (evento_id, laboratorio)
);

-- ── Avisos ────────────────────────────────────────────────
CREATE TABLE avisos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT NOT NULL,
    conteudo        TEXT NOT NULL,
    tipo            TEXT NOT NULL DEFAULT 'normal'
                    CHECK (tipo IN ('normal', 'importante', 'urgente')),
    criado_por_uid  TEXT REFERENCES users(uid),
    firestore_id    TEXT UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE aviso_leituras (
    aviso_id   UUID REFERENCES avisos(id) ON DELETE CASCADE,
    user_uid   TEXT REFERENCES users(uid),
    lido_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (aviso_id, user_uid)
);

-- ── Revisões dos Técnicos ─────────────────────────────────
CREATE TABLE revisoes_tecnicos (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tecnico_uid  TEXT NOT NULL REFERENCES users(uid),
    assunto      TEXT NOT NULL,
    tipo         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'planejada'
                 CHECK (status IN ('planejada', 'confirmada', 'realizada', 'cancelada')),
    data_inicio  TIMESTAMPTZ NOT NULL,
    data_fim     TIMESTAMPTZ NOT NULL,
    observacoes  TEXT,
    firestore_id TEXT UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Grupos de Técnicos ────────────────────────────────────
CREATE TABLE grupos (
    id          SERIAL PRIMARY KEY,
    nome        TEXT NOT NULL UNIQUE,
    firestore_id TEXT UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grupo_membros (
    grupo_id    INTEGER REFERENCES grupos(id) ON DELETE CASCADE,
    tecnico_uid TEXT REFERENCES users(uid),
    PRIMARY KEY (grupo_id, tecnico_uid)
);

-- ── Logs ─────────────────────────────────────────────────
CREATE TABLE logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type         TEXT NOT NULL,
    collection   TEXT NOT NULL,
    payload      JSONB,
    user_uid     TEXT,
    user_nome    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Config ───────────────────────────────────────────────
CREATE TABLE config (
    chave        TEXT PRIMARY KEY,
    valor        JSONB NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices para performance ──────────────────────────────
CREATE INDEX idx_aulas_data       ON aulas(data_inicio);
CREATE INDEX idx_aulas_status     ON aulas(status);
CREATE INDEX idx_aulas_laboratorio ON aulas(laboratorio);
CREATE INDEX idx_aulas_proposto   ON aulas(proposto_por_uid);
CREATE INDEX idx_eventos_data     ON eventos_manutencao(data_inicio);
CREATE INDEX idx_revisoes_tecnico ON revisoes_tecnicos(tecnico_uid);
CREATE INDEX idx_logs_created     ON logs(created_at DESC);

-- Full-text search em aulas (substitui o hack de >= <= no Firestore)
CREATE INDEX idx_aulas_fts ON aulas USING gin(to_tsvector('portuguese', assunto));
```

---

## 5. Autenticação — O Que Muda

O ponto mais sensível da migração. O Firebase Auth é quem gerencia o login Google hoje.

### Opção A — Manter Firebase Auth + trocar só o banco (recomendada)

Você continua usando Firebase Auth para login Google. Após o login, o frontend envia o **ID Token JWT** do Firebase para a nova API, que valida com o Firebase Admin SDK e retorna um token de sessão próprio.

```
Usuário → Login Google → Firebase Auth (token JWT)
               ↓
         Nova API (Node/Python) valida token com firebase-admin
               ↓
         Busca/cria user no PostgreSQL
               ↓
         Retorna JWT próprio para o frontend
```

**Vantagem:** zero mudança de UX, sem recriar contas.

### Opção B — Migrar para Auth.js / Supabase Auth

Mais trabalho inicial, mas elimina a dependência do Firebase por completo. O Supabase oferece login Google OAuth sem configuração manual.

### Opção C — Supabase (banco + auth juntos)

Supabase já inclui PostgreSQL + Auth (Google OAuth) + Storage. É a alternativa mais rápida ao Firebase.

---

## 6. Opções de Banco de Dados

### 6.1 Supabase ⭐ (recomendado para o caso do CESMAC)

| Item | Detalhes |
|------|----------|
| Tipo | PostgreSQL gerenciado |
| Plano gratuito | 500 MB storage, 2 projetos, 50.000 req/mês |
| Auth Google | Nativo, sem configuração extra |
| Realtime | Suporta subscriptions (substitui `onSnapshot`) |
| URL | [supabase.com](https://supabase.com) |
| Ideal para | Quem quer trocar Firebase com mínimo de reescrita |

### 6.2 Neon ⭐ (PostgreSQL serverless)

| Item | Detalhes |
|------|----------|
| Tipo | PostgreSQL serverless (branching de banco) |
| Plano gratuito | 0.5 GB, 1 projeto |
| Diferencial | Branch de banco por PR — ótimo para desenvolvimento |
| URL | [neon.tech](https://neon.tech) |
| Ideal para | Backend próprio (Node/Python) + banco separado |

### 6.3 Railway

| Item | Detalhes |
|------|----------|
| Tipo | PostgreSQL + hospedagem de API no mesmo lugar |
| Plano gratuito | $5 de créditos/mês (suficiente para uso acadêmico) |
| URL | [railway.app](https://railway.app) |
| Ideal para | Quem quer subir BD + API em um único painel |

### 6.4 CockroachDB (escala, mas complexo)

Não recomendado para este projeto — overkill para o volume do CESMAC.

---

## 7. Opções de Hospedagem do Frontend

O frontend React atual compila com Vite para arquivos estáticos — qualquer CDN serve.

### 7.1 Vercel ⭐ (recomendado)

- Plano gratuito generoso, deploy automático via GitHub
- Já tem `vercel.json` no projeto — setup zero
- Suporta Vercel Functions (resolve o problema da chave Groq sem Firebase Functions)
- Domínio gratuito `*.vercel.app`

### 7.2 Netlify

- Similar ao Vercel em features e preço
- Netlify Functions para proxy da API Groq
- Domínio gratuito `*.netlify.app`

### 7.3 Cloudflare Pages

- CDN global, deploy via Git
- Workers para lógica de backend (pago por uso, muito barato)
- Domínio gratuito `*.pages.dev`

### 7.4 Firebase Hosting (atual)

- Continua funcionando mesmo migrando o banco
- Pode coexistir: frontend no Firebase Hosting + dados no PostgreSQL

---

## 8. Opções de Hospedagem do Backend / API

Para a nova camada de API (que esconde as chaves secretas e faz operações no PostgreSQL):

### 8.1 Vercel Functions (serverless)

- Zero configuração adicional se já usa Vercel para o frontend
- Cada endpoint é um arquivo em `/api/`
- Limite gratuito: 100 GB/mês de bandwidth, 1 milhão de invocações
- **Resolve o problema da chave Groq** sem upgrade do Firebase

### 8.2 Railway

- Deploy de qualquer app Node/Python/Go
- Banco PostgreSQL e API no mesmo projeto
- `$5/mês` de crédito gratuito

### 8.3 Render

- Deploy de serviços web gratuitos (com sleep após inatividade)
- PostgreSQL gerenciado disponível
- Bom para APIs que não precisam de resposta instantânea 24/7

### 8.4 Fly.io

- Containers Docker, free tier generoso
- Boa opção para API Node ou FastAPI Python

---

## 9. Stack Recomendada (Custo Zero)

Considerando que o projeto é acadêmico e precisa de zero custo:

```
┌─────────────────────────────────────────────────┐
│              STACK RECOMENDADA                   │
│                                                  │
│  Frontend:  Vercel (já tem vercel.json)          │
│  Auth:      Firebase Auth (mantém login Google)  │
│  Banco:     Supabase PostgreSQL (free tier)      │
│  API:       Vercel Functions (/api/*.js)         │
│  AI Proxy:  Vercel Function /api/groq.js         │
│  Notif:     Telegram Bot API (sem mudança)       │
└─────────────────────────────────────────────────┘
```

**Por que essa combinação?**
- Vercel já está configurado (`vercel.json` existe no projeto)
- Supabase tem SDK JavaScript compatível com React
- Firebase Auth continua gerenciando contas sem recriar nada
- Vercel Functions resolvem o P0 de segurança da chave Groq
- Tudo no plano gratuito

---

## 10. Plano de Migração em Etapas

A ideia central é **criar uma cópia paralela** sem desligar o Firebase.

### Fase 0 — Preparação (1-2 dias)

```
[ ] Criar projeto Supabase (ou Neon)
[ ] Executar o schema SQL (seção 4)
[ ] Criar projeto Vercel separado (ex: cronolab-v2.vercel.app)
[ ] Configurar variáveis de ambiente no Vercel:
    - SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY
    - GROQ_API_KEY  ← fica só no servidor agora
    - FIREBASE_PROJECT_ID  ← para validar tokens
```

### Fase 1 — Cópia dos dados (1 dia)

```
[ ] Rodar script de migração (seção 11)
[ ] Verificar contagens: aulas, users, eventos
[ ] Validar datas e relacionamentos
```

### Fase 2 — API de leitura (3-5 dias)

```
[ ] Criar /api/aulas.js (GET com filtros)
[ ] Criar /api/usuarios.js (GET)
[ ] Criar /api/laboratorios.js (GET)
[ ] Criar /api/groq.js (proxy seguro)
[ ] Testar endpoints com Postman/Insomnia
```

### Fase 3 — Frontend paralelo (1-2 semanas)

```
[ ] Criar branch "feat/postgres-migration" no GitHub
[ ] Substituir firebase/firestore por fetch() nos componentes
[ ] Manter Firebase Auth intacto
[ ] Testar cada página no novo branch
```

### Fase 4 — API de escrita (1 semana)

```
[ ] POST /api/aulas (propor aula)
[ ] PATCH /api/aulas/:id/aprovar
[ ] POST /api/eventos
[ ] POST /api/avisos
[ ] Transações PostgreSQL para aprovar+notificar
```

### Fase 5 — Validação e switch (2-3 dias)

```
[ ] Testes de regressão nos fluxos críticos
[ ] Comparar dados Firebase vs. PostgreSQL
[ ] Deploy da versão nova para URL pública
[ ] Período de uso paralelo (1 semana)
[ ] Desativar Firebase Firestore (opcional)
```

---

## 11. Script de Cópia Inicial (Firestore → PostgreSQL)

Script Node.js para rodar uma única vez e copiar os dados:

```javascript
// scripts/migrate-firestore-to-pg.js
// Executar: node scripts/migrate-firestore-to-pg.js

const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// Inicializar Firebase Admin (baixe serviceAccountKey.json do Firebase Console)
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const firestore = admin.firestore();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrarUsers() {
  console.log('Migrando users...');
  const snapshot = await firestore.collection('users').get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { error } = await supabase.from('users').upsert({
      uid:              doc.id,
      name:             data.name || data.displayName || '',
      email:            data.email || '',
      role:             data.role || null,
      status:           data.status || (data.approvalPending ? 'pendente' : 'aprovado'),
      approval_pending: data.approvalPending ?? true,
      photo_url:        data.photoURL || null,
      telegram_chat_id: data.telegramChatId || null,
      created_at:       data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
    }, { onConflict: 'uid' });
    
    if (error) console.error('Erro user', doc.id, error.message);
  }
  console.log(`✓ ${snapshot.size} users migrados`);
}

async function migrarAulas() {
  console.log('Migrando aulas...');
  const snapshot = await firestore.collection('aulas').get();
  let ok = 0, erros = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    const dataInicio = data.dataInicio?.toDate?.() || new Date(data.dataInicio);
    const dataFim    = data.dataFim?.toDate?.()    || new Date(data.dataFim || data.dataInicio);
    
    const { error } = await supabase.from('aulas').upsert({
      assunto:           data.assunto || 'Sem assunto',
      tipo_atividade:    data.tipoAtividade || 'aula',
      laboratorio:       data.laboratorioSelecionado || data.laboratorio || 'Desconhecido',
      horario_slot:      data.horarioSlotString || '',
      data_inicio:       dataInicio.toISOString(),
      data_fim:          dataFim.toISOString(),
      status:            data.status || 'pendente',
      proposto_por_uid:  data.propostoPorUid || data.userId || null,
      proposto_por_nome: data.propostoPorNome || data.proponenteNome || null,
      is_revisao:        data.isRevisao || false,
      tipo_revisao_label:data.tipoRevisaoLabel || null,
      liga:              data.liga || null,
      observacoes:       data.observacoes || null,
      origem:            data.origem || 'manual',
      firestore_id:      doc.id,
    }, { onConflict: 'firestore_id' });
    
    if (error) {
      console.error('Erro aula', doc.id, error.message);
      erros++;
      continue;
    }
    
    // Inserir cursos
    if (Array.isArray(data.cursos) && data.cursos.length > 0) {
      const { data: aulaInserida } = await supabase
        .from('aulas')
        .select('id')
        .eq('firestore_id', doc.id)
        .single();
      
      if (aulaInserida) {
        await supabase.from('aula_cursos').upsert(
          data.cursos.map(curso => ({ aula_id: aulaInserida.id, curso })),
          { onConflict: 'aula_id,curso' }
        );
      }
    }
    ok++;
  }
  console.log(`✓ ${ok} aulas migradas (${erros} erros)`);
}

async function migrarEventos() {
  console.log('Migrando eventosManutencao...');
  const snapshot = await firestore.collection('eventosManutencao').get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { error } = await supabase.from('eventos_manutencao').upsert({
      titulo:          data.titulo || '',
      descricao:       data.descricao || null,
      tipo:            data.tipo || 'Manutenção',
      status:          data.status || 'aprovado',
      laboratorio:     data.laboratorio || 'Todos',
      horario_slot:    data.horarioSlotString || null,
      data_inicio:     data.dataInicio?.toDate?.()?.toISOString() || new Date().toISOString(),
      data_fim:        data.dataFim?.toDate?.()?.toISOString()    || new Date().toISOString(),
      criado_por_uid:  data.criadoPorUid || null,
      criado_por_nome: data.criadoPorNome || null,
      firestore_id:    doc.id,
    }, { onConflict: 'firestore_id' });
    
    if (error) console.error('Erro evento', doc.id, error.message);
  }
  console.log(`✓ ${snapshot.size} eventos migrados`);
}

async function migrarAvisos() {
  console.log('Migrando avisos...');
  const snapshot = await firestore.collection('avisos').get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { error } = await supabase.from('avisos').upsert({
      titulo:         data.titulo || '',
      conteudo:       data.conteudo || data.mensagem || '',
      tipo:           data.tipo || 'normal',
      criado_por_uid: data.criadoPorUid || null,
      firestore_id:   doc.id,
      created_at:     data.criadoEm?.toDate?.()?.toISOString() || new Date().toISOString(),
    }, { onConflict: 'firestore_id' });
    
    if (error) console.error('Erro aviso', doc.id, error.message);
  }
  console.log(`✓ ${snapshot.size} avisos migrados`);
}

async function main() {
  console.log('=== Migração Firestore → PostgreSQL ===\n');
  
  await migrarUsers();
  await migrarAulas();
  await migrarEventos();
  await migrarAvisos();
  
  console.log('\n=== Migração concluída! ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
```

**Para rodar:**
```bash
npm install firebase-admin @supabase/supabase-js dotenv
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-firestore-to-pg.js
```

---

## 12. O Que Muda no Código React

### 12.1 Substituir imports do Firebase

**Antes (Firestore):**
```javascript
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

// Buscar aulas
const q = query(collection(db, 'aulas'), where('status', '==', 'aprovada'));
const snap = await getDocs(q);
const aulas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
```

**Depois (Supabase):**
```javascript
import { supabase } from './supabaseConfig';

// Buscar aulas — equivalente
const { data: aulas, error } = await supabase
  .from('aulas')
  .select('*, aula_cursos(curso), aula_tecnicos(tecnico_uid)')
  .eq('status', 'aprovada');
```

### 12.2 Substituir `onSnapshot` por Supabase Realtime

**Antes:**
```javascript
const unsubscribe = onSnapshot(query(collection(db, 'aulas'), ...), (snap) => {
  setAulas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});
```

**Depois:**
```javascript
const channel = supabase
  .channel('aulas-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'aulas' },
    (payload) => {
      // atualizar estado conforme payload.eventType
    }
  )
  .subscribe();

// cleanup
return () => supabase.removeChannel(channel);
```

### 12.3 Proxy da Groq (resolve P0 de segurança)

Criar `api/groq.js` no Vercel:

```javascript
// api/groq.js — Vercel Function
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  // Validar token Firebase antes de chamar Groq
  // (firebase-admin no servidor)
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, // ← só no servidor
    },
    body: JSON.stringify(req.body.payload),
  });
  
  const data = await response.json();
  res.status(response.status).json(data);
}
```

No frontend, o `AssistenteIATecnico.jsx` já tenta `/api/groq` como fallback — **isso já está implementado** no código atual. Só falta o arquivo no servidor.

---

## 13. Comparativo Firebase vs. Nova Stack

| Critério | Firebase (atual) | Supabase + Vercel |
|----------|-----------------|-------------------|
| **Banco de dados** | Firestore (NoSQL) | PostgreSQL (relacional) |
| **Queries complexas** | Limitadas, sem JOIN | SQL completo, JOIN nativo |
| **Full-text search** | Não tem (hack de string) | `tsvector` nativo |
| **Transações** | Limitadas (batch write) | ACID completo |
| **Backend/serverless** | Bloqueado no Spark | Vercel Functions (grátis) |
| **Chave Groq** | Exposta no bundle | No servidor (seguro) |
| **Auth Google** | Firebase Auth | Firebase Auth mantido |
| **Realtime** | `onSnapshot` | Supabase Realtime |
| **Hospedagem frontend** | Firebase Hosting | Vercel |
| **Custo mensal** | R$ 0 | R$ 0 |
| **Cloud Functions** | Requer plano Blaze (pago) | Vercel Functions (grátis) |
| **Backup automático** | Não no plano Spark | Sim (Supabase) |
| **SQL REPL/Console** | Não | Sim (Supabase Studio) |

---

## 14. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Perda de dados na migração | Baixa | Alto | Script faz `upsert` (não sobrescreve), Firebase fica ativo |
| `onSnapshot` sem equivalente | Média | Médio | Supabase Realtime é equivalente direto |
| Datas com timezone errado | Média | Médio | Usar `TIMESTAMPTZ` e testar com dados reais antes |
| Cursos/labs como arrays no Firestore | Baixa | Médio | Script já trata conversão para tabelas relacionais |
| Firebase Auth depender do Firestore | Baixa | Alto | Auth usa coleção `users` separada; migrada com `uid` igual |
| Supabase free tier atingir limite | Baixa | Médio | 500 MB é suficiente para 3K+ aulas; monitorar |

---

## 15. Checklist de Execução

```
PRÉ-MIGRAÇÃO
[ ] Fazer backup completo do Firestore (exportar via Console)
[ ] Criar conta e projeto no Supabase
[ ] Executar schema SQL completo
[ ] Criar projeto Vercel separado (não sobrescrever o atual)
[ ] Configurar variáveis de ambiente no Vercel

MIGRAÇÃO DOS DADOS
[ ] Baixar serviceAccountKey.json do Firebase Console
[ ] Executar migrate-firestore-to-pg.js
[ ] Validar contagem: SELECT COUNT(*) FROM aulas;
[ ] Validar contagem: SELECT COUNT(*) FROM users;
[ ] Verificar relacionamentos: aula_cursos, aula_tecnicos

BACKEND / API
[ ] Criar api/groq.js (proxy Groq)
[ ] Criar api/aulas.js (GET + filtros)
[ ] Criar api/auth/validate.js (validar token Firebase)
[ ] Testar endpoints localmente

FRONTEND (branch separado)
[ ] Criar supabaseConfig.js (equivalente ao firebaseConfig.js)
[ ] Substituir queries Firestore por Supabase em:
    [ ] PaginaInicial.jsx
    [ ] CalendarioCronograma.jsx
    [ ] GerenciarAprovacoes.jsx
    [ ] AnaliseAulas.jsx
    [ ] DownloadCronograma.jsx
[ ] Manter Firebase Auth intacto

VALIDAÇÃO
[ ] Testar login e fluxo de aprovação
[ ] Comparar dados entre Firebase e PostgreSQL
[ ] Testar AssistenteIA com proxy Groq seguro
[ ] Testar export Excel/PDF/ICS

PRODUÇÃO
[ ] Deploy do branch para cronolab-v2.vercel.app
[ ] Período de uso paralelo (recomendado: 1 semana)
[ ] Comunicar usuários sobre nova URL
[ ] Desativar Firebase Firestore (opcional, quando conveniente)
```

---

*Análise elaborada a partir do código-fonte completo do CronoLab — CESMAC · Maceió, AL · 2026*
