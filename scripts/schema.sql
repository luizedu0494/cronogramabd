-- =========================================================
-- CronoLab — Schema PostgreSQL (Supabase)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Usuários ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    uid              TEXT PRIMARY KEY,          -- mesmo UID do Firebase Auth
    name             TEXT NOT NULL,
    email            TEXT NOT NULL UNIQUE,
    role             TEXT CHECK (role IN ('coordenador', 'tecnico')) DEFAULT NULL,
    status           TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    approval_pending BOOLEAN NOT NULL DEFAULT TRUE,
    photo_url        TEXT,
    telegram_chat_id TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Laboratórios ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laboratorios (
    id     SERIAL PRIMARY KEY,
    name   TEXT NOT NULL UNIQUE,
    tipo   TEXT NOT NULL DEFAULT 'Geral',
    ativo  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Cursos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cursos (
    id    SERIAL PRIMARY KEY,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL
);

-- ── Aulas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aulas (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assunto               TEXT NOT NULL,
    tipo_atividade        TEXT NOT NULL DEFAULT 'aula',
    laboratorio           TEXT NOT NULL,
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
    firestore_id          TEXT UNIQUE,         -- ID original do Firestore (para migração e deduplicação)
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cursos de cada aula (relação N:N)
CREATE TABLE IF NOT EXISTS aula_cursos (
    aula_id    UUID REFERENCES aulas(id) ON DELETE CASCADE,
    curso      TEXT NOT NULL,
    PRIMARY KEY (aula_id, curso)
);

-- Técnicos designados por aula (relação N:N)
CREATE TABLE IF NOT EXISTS aula_tecnicos (
    aula_id     UUID REFERENCES aulas(id) ON DELETE CASCADE,
    tecnico_uid TEXT REFERENCES users(uid),
    PRIMARY KEY (aula_id, tecnico_uid)
);

-- ── Eventos de Manutenção ─────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos_manutencao (
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
CREATE TABLE IF NOT EXISTS evento_laboratorios (
    evento_id      UUID REFERENCES eventos_manutencao(id) ON DELETE CASCADE,
    laboratorio    TEXT NOT NULL,
    PRIMARY KEY (evento_id, laboratorio)
);

-- ── Avisos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avisos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT NOT NULL,
    conteudo        TEXT NOT NULL,
    tipo            TEXT NOT NULL DEFAULT 'normal'
                    CHECK (tipo IN ('normal', 'importante', 'urgente')),
    criado_por_uid  TEXT REFERENCES users(uid),
    firestore_id    TEXT UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aviso_leituras (
    aviso_id   UUID REFERENCES avisos(id) ON DELETE CASCADE,
    user_uid   TEXT REFERENCES users(uid),
    lido_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (aviso_id, user_uid)
);

-- ── Revisões dos Técnicos ─────────────────────────────────
CREATE TABLE IF NOT EXISTS revisoes_tecnicos (
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
CREATE TABLE IF NOT EXISTS grupos (
    id           SERIAL PRIMARY KEY,
    nome         TEXT NOT NULL UNIQUE,
    firestore_id TEXT UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Períodos sem Atividade (Feriados / Recessos) ───────────
CREATE TABLE IF NOT EXISTS periodos_sem_atividade (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao    TEXT NOT NULL,
    data_inicio  TIMESTAMPTZ NOT NULL,
    data_fim     TIMESTAMPTZ NOT NULL,
    tipo         TEXT DEFAULT 'manual',
    fonte        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS grupo_membros (
    grupo_id    INTEGER REFERENCES grupos(id) ON DELETE CASCADE,
    tecnico_uid TEXT REFERENCES users(uid),
    PRIMARY KEY (grupo_id, tecnico_uid)
);

-- ── Logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type         TEXT NOT NULL,
    collection   TEXT NOT NULL,
    payload      JSONB,
    user_uid     TEXT,
    user_nome    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Config ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
    chave        TEXT PRIMARY KEY,
    valor        JSONB NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices para performance ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_aulas_data         ON aulas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_aulas_status       ON aulas(status);
CREATE INDEX IF NOT EXISTS idx_aulas_laboratorio  ON aulas(laboratorio);
CREATE INDEX IF NOT EXISTS idx_aulas_proposto     ON aulas(proposto_por_uid);
CREATE INDEX IF NOT EXISTS idx_eventos_data       ON eventos_manutencao(data_inicio);
CREATE INDEX IF NOT EXISTS idx_revisoes_tecnico   ON revisoes_tecnicos(tecnico_uid);
CREATE INDEX IF NOT EXISTS idx_logs_created       ON logs(created_at DESC);

-- Full-text search em aulas
CREATE INDEX IF NOT EXISTS idx_aulas_fts ON aulas USING gin(to_tsvector('portuguese', assunto));
