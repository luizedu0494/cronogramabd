-- =====================================================================
-- CronoLab — Schema de Notificações Completo
-- Módulo de Notificações Personalizáveis (Telegram, Web Push VAPID, In-App, Seguidores)
-- =====================================================================

-- Extensão uuid-ossp (caso não criada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. Preferências de Notificação por Usuário
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacao_preferencias (
  user_uid                  TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  -- Canais
  telegram_ativo            BOOLEAN NOT NULL DEFAULT FALSE,
  webpush_ativo             BOOLEAN NOT NULL DEFAULT FALSE,
  inapp_ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  -- Eventos
  evento_aula_adicionada    BOOLEAN NOT NULL DEFAULT TRUE,
  evento_aula_editada       BOOLEAN NOT NULL DEFAULT TRUE,
  evento_aula_excluida      BOOLEAN NOT NULL DEFAULT TRUE,
  evento_manutencao         BOOLEAN NOT NULL DEFAULT TRUE,
  evento_aviso_normal       BOOLEAN NOT NULL DEFAULT FALSE,
  evento_aviso_importante   BOOLEAN NOT NULL DEFAULT TRUE,
  evento_aviso_urgente      BOOLEAN NOT NULL DEFAULT TRUE,
  evento_proposta_status    BOOLEAN NOT NULL DEFAULT TRUE,
  -- Lembretes
  lembrete_ativo            BOOLEAN NOT NULL DEFAULT FALSE,
  lembrete_horas_antes      INTEGER NOT NULL DEFAULT 2,
  -- Filtros
  labs_interesse            TEXT[] NOT NULL DEFAULT '{}',
  cursos_interesse          TEXT[] NOT NULL DEFAULT '{}',
  apenas_proprias           BOOLEAN NOT NULL DEFAULT FALSE,
  -- Silêncio
  silencio_ativo            BOOLEAN NOT NULL DEFAULT FALSE,
  silencio_inicio           TIME NOT NULL DEFAULT '22:00',
  silencio_fim              TIME NOT NULL DEFAULT '07:00',
  silencio_fds              BOOLEAN NOT NULL DEFAULT FALSE,
  atualizado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notificacao_preferencias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificacao_preferencias' AND policyname = 'usuario_gerencia_proprias_prefs'
  ) THEN
    CREATE POLICY "usuario_gerencia_proprias_prefs" ON notificacao_preferencias
      FOR ALL USING (auth.uid() = user_uid);
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 2. Subscrições Web Push (VAPID) — Suporte a Múltiplos Dispositivos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid      TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_uid) WHERE ativo = TRUE;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'usuario_gerencia_proprias_subscricoes'
  ) THEN
    CREATE POLICY "usuario_gerencia_proprias_subscricoes" ON push_subscriptions
      FOR ALL USING (auth.uid() = user_uid);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'sistema_le_para_envio'
  ) THEN
    CREATE POLICY "sistema_le_para_envio" ON push_subscriptions
      FOR SELECT USING (TRUE);
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3. Histórico e Centro de Notificações In-App
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacoes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_nao_lida
  ON notificacoes(destinatario_uid, lida, criada_em DESC) WHERE lida = FALSE;

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'usuario_le_proprias'
  ) THEN
    CREATE POLICY "usuario_le_proprias" ON notificacoes
      FOR SELECT USING (auth.uid() = destinatario_uid);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'usuario_atualiza_proprias'
  ) THEN
    CREATE POLICY "usuario_atualiza_proprias" ON notificacoes
      FOR UPDATE USING (auth.uid() = destinatario_uid);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'sistema_insere'
  ) THEN
    CREATE POLICY "sistema_insere" ON notificacoes
      FOR INSERT WITH CHECK (TRUE);
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 4. Vinculação Temporária Telegram Self-Service
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telegram_vinculos_pendentes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid    TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  codigo      TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION limpar_vinculos_expirados()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM telegram_vinculos_pendentes WHERE expires_at < NOW();
$$;


-- ---------------------------------------------------------------------
-- 5. Seguidores de Aulas Específicas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aula_seguidores (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aula_id               UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  user_uid              TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  motivo                TEXT NOT NULL CHECK (motivo IN ('designado', 'interesse', 'coordenacao')),
  notificar_alteracoes  BOOLEAN NOT NULL DEFAULT TRUE,
  notificar_lembrete    BOOLEAN NOT NULL DEFAULT TRUE,
  lembrete_horas_antes  INTEGER NOT NULL DEFAULT 2 CHECK (lembrete_horas_antes IN (1, 2, 4, 12, 24)),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aula_id, user_uid)
);

CREATE INDEX IF NOT EXISTS idx_aula_seguidores_user ON aula_seguidores(user_uid);
CREATE INDEX IF NOT EXISTS idx_aula_seguidores_aula ON aula_seguidores(aula_id);

ALTER TABLE aula_seguidores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'aula_seguidores' AND policyname = 'usuario_gerencia_proprios'
  ) THEN
    CREATE POLICY "usuario_gerencia_proprios" ON aula_seguidores
      FOR ALL USING (
        auth.uid() = user_uid
        OR EXISTS (
          SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'coordenador'
        )
      );
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 6. Regras de Seguimento Automático por Filtro
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regras_notificacao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid        TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  laboratorios    TEXT[] NOT NULL DEFAULT '{}',
  cursos          TEXT[] NOT NULL DEFAULT '{}',
  tipos_atividade TEXT[] NOT NULL DEFAULT '{}',
  dias_semana     INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  turno           TEXT[] NOT NULL DEFAULT '{}',
  ativa           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE regras_notificacao ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'regras_notificacao' AND policyname = 'usuario_gerencia_proprias_regras'
  ) THEN
    CREATE POLICY "usuario_gerencia_proprias_regras" ON regras_notificacao
      FOR ALL USING (auth.uid() = user_uid);
  END IF;
END $$;

-- Trigger para aplicar regras de seguimento automático ao aprovar/inserir aula
CREATE OR REPLACE FUNCTION aplicar_regras_seguimento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  regra RECORD;
BEGIN
  FOR regra IN
    SELECT * FROM regras_notificacao WHERE ativa = TRUE
  LOOP
    IF (
      (cardinality(regra.laboratorios) = 0 OR NEW."laboratorioSelecionado" = ANY(regra.laboratorios))
      AND (cardinality(regra.cursos) = 0 OR NEW.cursos && regra.cursos)
    ) THEN
      INSERT INTO aula_seguidores (aula_id, user_uid, motivo, notificar_alteracoes, notificar_lembrete)
      VALUES (NEW.id, regra.user_uid, 'interesse', TRUE, TRUE)
      ON CONFLICT (aula_id, user_uid) DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_regras_seguimento ON aulas;
CREATE TRIGGER trigger_regras_seguimento
  AFTER INSERT OR UPDATE OF status ON aulas
  FOR EACH ROW WHEN (NEW.status = 'aprovada')
  EXECUTE FUNCTION aplicar_regras_seguimento();


-- ---------------------------------------------------------------------
-- 7. Lembretes Programados (pg_cron)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION processar_lembretes_pendentes()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      s.user_uid,
      s.aula_id,
      s.lembrete_horas_antes,
      a.assunto,
      a."dataInicio",
      a."laboratorioSelecionado",
      a."horarioSlotString"
    FROM aula_seguidores s
    JOIN aulas a ON a.id = s.aula_id
    WHERE
      s.notificar_lembrete = TRUE
      AND a.status = 'aprovada'
      AND a."dataInicio" BETWEEN NOW() + (s.lembrete_horas_antes * INTERVAL '1 hour') - INTERVAL '30 minutes'
                             AND NOW() + (s.lembrete_horas_antes * INTERVAL '1 hour') + INTERVAL '30 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM notificacoes n
        WHERE n.destinatario_uid = s.user_uid
          AND n.aula_id = s.aula_id
          AND n.tipo = 'lembrete_aula'
          AND n.criada_em > NOW() - INTERVAL '25 minutes'
      )
  LOOP
    INSERT INTO notificacoes (destinatario_uid, tipo, titulo, corpo, aula_id)
    VALUES (
      r.user_uid,
      'lembrete_aula',
      '🔔 Aula em ' || r.lembrete_horas_antes || 'h — ' || r.assunto,
      r."laboratorioSelecionado" || ' · ' || r."horarioSlotString",
      r.aula_id
    );
  END LOOP;
END;
$$;
