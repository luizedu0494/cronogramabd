-- ==============================================================================
-- CronoLab Migration: Notificações Nativas e Push Tokens (Web VAPID & Mobile Expo)
-- ==============================================================================

-- 1. Notificações in-app (histórico persistente e realtime)
CREATE TABLE IF NOT EXISTS notificacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_uid  TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN (
    'aula_adicionada', 'aula_editada', 'aula_excluida',
    'evento_manutencao', 'aviso_normal', 'aviso_importante',
    'aviso_urgente', 'aprovacao_proposta', 'lembrete_aula'
  )),
  titulo            TEXT NOT NULL,
  corpo             TEXT NOT NULL,
  lida              BOOLEAN NOT NULL DEFAULT FALSE,
  aula_id           UUID REFERENCES aulas(id) ON DELETE SET NULL,
  evento_id         UUID REFERENCES "eventosManutencao"(id) ON DELETE SET NULL,
  aviso_id          UUID REFERENCES avisos(id) ON DELETE SET NULL,
  criada_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lida_em           TIMESTAMPTZ
);

-- Índice otimizado para consultas de notificações não lidas
CREATE INDEX IF NOT EXISTS idx_notificacoes_nao_lidas
  ON notificacoes(destinatario_uid, lida, criada_em DESC) WHERE lida = FALSE;

-- Enable Row Level Security (RLS)
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver apenas suas próprias notificações"
  ON notificacoes FOR SELECT
  USING (auth.uid()::text = destinatario_uid);

CREATE POLICY "Usuários podem atualizar o status de leitura de suas notificações"
  ON notificacoes FOR UPDATE
  USING (auth.uid()::text = destinatario_uid);

-- Habilitar Realtime para a tabela notificacoes
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;


-- 2. Tokens Web Push (VAPID) — Para navegadores e PWAs
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid      TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias inscrições de Web Push"
  ON push_subscriptions FOR ALL
  USING (auth.uid()::text = user_uid);


-- 3. Tokens Expo Push — Para dispositivos móveis (iOS e Android)
CREATE TABLE IF NOT EXISTS push_tokens_mobile (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid      TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  expo_token    TEXT NOT NULL UNIQUE,
  platform      TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_tokens_mobile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios tokens de Expo Push"
  ON push_tokens_mobile FOR ALL
  USING (auth.uid()::text = user_uid);
