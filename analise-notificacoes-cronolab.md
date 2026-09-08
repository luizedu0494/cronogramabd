# CronoLab — Análise e Proposta Completa: Sistema de Notificações Personalizáveis

> Documento técnico focado em quatro eixos: **notificações Telegram individuais**, **Web Push avançado nativo**, **marcação de usuários em aulas específicas** e **personalização por perfil de usuário**, respeitando os limites de segurança do modo Visitante.  
> Stack: **Supabase (PostgreSQL + Auth + Realtime + Edge Functions)** + **Vercel Serverless** + **Web Push API nativa (VAPID)**.

---

## Diagnóstico do Estado Atual

### O que existe hoje

| Componente | Situação |
|---|---|
| `NotificadorTelegram.ts` | Dois arquivos duplicados (`src/services/` e `src/ia-estruturada/`) — correções precisam ser replicadas manualmente |
| Canal Telegram | Envia para um `TELEGRAM_CHAT_ID` único e fixo — hardcoded nas chamadas de `GerenciarAulasAvancado`, `GerenciarEventosAvancado`, `ProporEventoForm` |
| Web Push | Os arquivos `save-push-token.js` e `send-push-notification.js` existem, mas usam o SDK do Firebase Cloud Messaging como backend de entrega — o que cria uma dependência desnecessária do Firebase quando o projeto já migrou para Supabase |
| `firebase-messaging-sw.js` | Service Worker acoplado ao SDK do Firebase; precisa ser substituído por um SW puro usando a **Web Push API nativa** com **VAPID**, sem nenhuma biblioteca Firebase |
| Preferências de notificação | Não existem — o usuário não controla nada |
| Marcação em aulas | O campo `tecnicos` (array de UIDs) existe no schema, mas não há mecanismo para um usuário solicitar ser notificado de uma aula específica sem ser técnico designado |
| Visitantes | Corretamente sem nenhuma funcionalidade de notificação — acesso é somente leitura |

### Problemas-raiz identificados

**1. Telegram em grupo, não individual.** O `TELEGRAM_CHAT_ID` é uma constante global no código. Qualquer notificação vai para um único destino — provavelmente um grupo ou o chat do desenvolvedor — e não para o usuário correto. O campo `telegram_chat_id` já existe na tabela `users` no Supabase, mas nunca é consultado nas chamadas de `enviarNotificacao`.

**2. Web Push atrelado ao Firebase.** O Service Worker atual importa `firebase-messaging-sw.js` e usa `initializeApp` + `getMessaging` do SDK Firebase apenas para receber push. Isso é desnecessário: a **Web Push API com VAPID** é um padrão do navegador e funciona direto com Vercel Serverless e a `web-push` library no Node — sem Firebase.

**3. Tokens de push salvos sem estrutura.** O `save-push-token.js` salva tokens de uma forma que não permite múltiplos dispositivos por usuário nem associação com preferências.

**4. Nenhum filtro de preferências.** Todo evento dispara notificação para todos que têm canal configurado — sem distinção de laboratório, curso, tipo de evento ou horário.

**5. Marcação em aulas limitada ao papel de técnico.** A tabela já tem `tecnicos[]`, mas um professor ou coordenador que queira acompanhar uma aula específica não tem como fazer isso.

**6. Sem histórico ou log de notificações.** Uma notificação enviada e não vista some. Não há centro de notificações in-app.

---

## Proposta 1 — Telegram Individual e Personalizado

### 1.1 Corrigir o envio para o usuário correto

O problema fundamental é o `TELEGRAM_CHAT_ID` estático. A correção é buscar o `telegram_chat_id` de cada destinatário no Supabase:

```typescript
// src/services/NotificadorTelegram.ts — método corrigido
async enviarParaUsuario(uid: string, dados: DadosAula, tipo: TipoNotificacao): Promise<boolean> {
  const { data: usuario } = await supabase
    .from('users')
    .select('telegram_chat_id')
    .eq('uid', uid)
    .single();

  if (!usuario?.telegram_chat_id) return false;

  // Verificar preferências antes de enviar
  const aceita = await this.usuarioAceitaTipo(uid, tipo);
  if (!aceita) return false;

  return this.enviarNotificacao(usuario.telegram_chat_id, dados, tipo);
}

// Envia para todos os usuários interessados em um lab/curso
async enviarParaInteressados(
  payload: PayloadNotificacao,
  tipo: TipoNotificacao,
  filtro: { laboratorio?: string; cursos?: string[] }
): Promise<void> {
  // Busca usuários aprovados cujos labs_interesse incluem o lab da aula
  // OU cujos cursos_interesse têm interseção com os cursos da aula
  const { data: destinatarios } = await supabase
    .from('users')
    .select('uid, telegram_chat_id')
    .eq('status', 'aprovado')
    .not('telegram_chat_id', 'is', null);

  const { data: preferencias } = await supabase
    .from('notificacao_preferencias')
    .select('*')
    .in('user_uid', destinatarios.map(u => u.uid))
    .eq('telegram_ativo', true);

  for (const pref of preferencias) {
    if (!this.passaFiltro(pref, filtro, tipo)) continue;
    if (this.estaNoSilencio(pref)) continue;

    const usuario = destinatarios.find(u => u.uid === pref.user_uid);
    if (usuario?.telegram_chat_id) {
      await this.enviarNotificacao(usuario.telegram_chat_id, payload, tipo);
    }
  }
}
```

### 1.2 Substituir o CHAT_ID estático em todos os componentes

Em `GerenciarAulasAvancado.jsx`, `GerenciarEventosAvancado.jsx` e `ProporEventoForm.jsx`:

```javascript
// ❌ Como está hoje — destino único e fixo
await notificadorTelegram.enviarNotificacao(TELEGRAM_CHAT_ID, payload, 'evento_editar');

// ✅ Como deve ficar — despacha para quem tem interesse no lab/curso
await notificationService.despachar(payload, 'aula_editada', {
  laboratorio: aula.laboratorioSelecionado,
  cursos: aula.cursos,
});
```

### 1.3 Fluxo self-service de vinculação do Telegram

Atualmente o `telegram_chat_id` precisa ser inserido manualmente no banco. O fluxo deve ser:

```
1. Usuário acessa Perfil → Notificações → "Conectar Telegram"
2. Sistema gera um código temporário único (ex: CRN-7X4A), válido por 15 minutos
   → Armazenado em uma tabela `telegram_vinculos_pendentes` com user_uid + codigo + expires_at
3. Tela exibe: "Envie a mensagem /vincular CRN-7X4A para @CronoLabBot"
4. Bot recebe a mensagem, valida o código na tabela, salva o chat_id no users
   → Deleta o registro de `telegram_vinculos_pendentes`
5. Supabase Realtime notifica o frontend → tela atualiza para "Conectado" sem refresh
```

```sql
CREATE TABLE telegram_vinculos_pendentes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid    TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  codigo      TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Limpeza automática de códigos expirados
CREATE OR REPLACE FUNCTION limpar_vinculos_expirados()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM telegram_vinculos_pendentes WHERE expires_at < NOW();
$$;

SELECT cron.schedule('limpar-vinculos-telegram', '*/5 * * * *', $$ SELECT limpar_vinculos_expirados(); $$);
```

O webhook do bot Telegram (Vercel Serverless) que processa o código:

```javascript
// api/telegram-webhook.js
export default async function handler(req, res) {
  const { message } = req.body;
  if (!message?.text?.startsWith('/vincular ')) return res.status(200).end();

  const codigo = message.text.split(' ')[1]?.trim().toUpperCase();
  const chatId = String(message.chat.id);

  // Valida o código e busca o user_uid
  const { data: vinculo } = await supabaseAdmin
    .from('telegram_vinculos_pendentes')
    .select('user_uid')
    .eq('codigo', codigo)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!vinculo) {
    await enviarMensagemTelegram(chatId, '❌ Código inválido ou expirado. Gere um novo no CronoLab.');
    return res.status(200).end();
  }

  // Salva o chat_id no usuário
  await supabaseAdmin
    .from('users')
    .update({ telegram_chat_id: chatId })
    .eq('uid', vinculo.user_uid);

  // Remove o código usado
  await supabaseAdmin
    .from('telegram_vinculos_pendentes')
    .delete()
    .eq('codigo', codigo);

  await enviarMensagemTelegram(chatId, '✅ Telegram vinculado com sucesso ao CronoLab!');
  res.status(200).end();
}
```

### 1.4 Tipos de evento configuráveis pelo usuário

```typescript
interface PreferenciasTelegram {
  ativo: boolean;
  aula_adicionada: boolean;
  aula_editada: boolean;
  aula_excluida: boolean;
  evento_manutencao: boolean;
  aprovacao_proposta: boolean;      // relevante para técnicos
  aviso_urgente: boolean;
  aviso_importante: boolean;
  aviso_normal: boolean;
  lembrete_ativo: boolean;
  lembrete_horas_antes: number;     // 1 | 2 | 4 | 12 | 24
  laboratorios_interesse: string[]; // [] = todos
  cursos_interesse: string[];       // [] = todos
}
```

### 1.5 Bot com comandos interativos

Em vez de só receber, o bot pode responder — tornando o Telegram um canal bidirecional:

| Comando | Ação |
|---|---|
| `/hoje` | Lista aulas do dia nos labs de interesse do usuário |
| `/amanha` | Lista aulas do dia seguinte |
| `/semana` | Visão da semana atual |
| `/pausar 2h` | Silencia notificações por N horas |
| `/retomar` | Reativa notificações |
| `/status` | Mostra configurações ativas |
| `/desvincular` | Remove o vínculo do chat_id |

O webhook Vercel em `api/telegram-webhook.js` centraliza o processamento de todos esses comandos, consultando o Supabase para montar as respostas.

---

## Proposta 2 — Web Push Nativo (VAPID) sem Firebase

### 2.1 Por que remover o Firebase do Web Push

O projeto já usa Supabase como banco, auth e realtime. Manter o SDK do Firebase apenas para Cloud Messaging cria:

- Dependência de uma lib pesada (`firebase/messaging`) só para receber push
- Obrigação de manter `VITE_FIREBASE_*` nas variáveis de ambiente
- `firebase-messaging-sw.js` no bundle público, com a chave do projeto Firebase exposta
- Conflito conceitual: o app é Supabase, mas o push é Firebase

A **Web Push API com VAPID** funciona em todos os navegadores modernos, é um padrão W3C, e despacha as notificações direto da Vercel Serverless usando a library `web-push` — sem intermediários.

### 2.2 Configuração VAPID (uma vez)

```bash
# Gerar o par de chaves VAPID — rodar localmente uma única vez
npx web-push generate-vapid-keys
# Saída:
# Public Key: BEl62iUYgUivxIkv...
# Private Key: uf_yyRTzprLxQIb...
```

Adicionar ao `.env`:

```env
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv...
VAPID_PRIVATE_KEY=uf_yyRTzprLxQIb...
VAPID_SUBJECT=mailto:admin@cronolab.app
# Expor apenas a pública para o frontend
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv...
```

### 2.3 Novo Service Worker puro — `public/sw.js`

Substituir `firebase-messaging-sw.js` por um SW limpo, sem nenhuma dependência:

```javascript
// public/sw.js — Service Worker puro, sem Firebase

self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {};
  const { title = 'CronoLab', body = '', data = {} } = payload;

  const options = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'cronolab-geral',        // agrupa notificações do mesmo lab
    requireInteraction: data.urgente === true, // aviso urgente não fecha sozinho
    data,
    actions: gerarAcoes(data.tipo),
    timestamp: data.dataAula
      ? new Date(data.dataAula).getTime()
      : Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

function gerarAcoes(tipo) {
  const mapa = {
    aula_adicionada:   [{ action: 'ver', title: '📅 Ver no Calendário' }, { action: 'ok', title: '✕ Ok' }],
    aula_editada:      [{ action: 'ver', title: '📅 Ver Alteração' }],
    aula_excluida:     [{ action: 'ver', title: '🗓 Ver Calendário' }],
    aprovacao_proposta:[{ action: 'aprovar', title: '✅ Aprovar' }, { action: 'ver_detalhes', title: '🔍 Detalhes' }],
    aviso_urgente:     [{ action: 'ver_aviso', title: '📢 Ver Aviso' }],
    lembrete_aula:     [{ action: 'ver', title: '📅 Ver Aula' }, { action: 'snooze', title: '🔔 +30min' }],
    evento_manutencao: [{ action: 'ver', title: '🔧 Ver Evento' }],
  };
  return mapa[tipo] ?? [{ action: 'ver', title: '🔗 Abrir CronoLab' }];
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const data = event.notification.data || {};

  const rotas = {
    ver:          `/calendario?aula=${data.aulaId ?? ''}`,
    ver_detalhes: `/gerenciar-aprovacoes?proposta=${data.aulaId ?? ''}`,
    ver_aviso:    `/avisos?aviso=${data.avisoId ?? ''}`,
    aprovar:      `/api/aprovar-rapido?id=${data.aulaId ?? ''}`,
    snooze:       null, // tratado abaixo com setTimeout no SW
  };

  if (action === 'snooze' && data.aulaId) {
    // Re-enfileira lembrete em 30 minutos no SW
    event.waitUntil(
      new Promise(resolve => setTimeout(async () => {
        await self.registration.showNotification('🔔 Lembrete — ' + (data.assunto ?? 'Aula'), {
          body: data.body ?? '',
          tag: 'snooze-' + data.aulaId,
          data,
        });
        resolve();
      }, 30 * 60 * 1000))
    );
    return;
  }

  const url = rotas[action] ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ tipo: 'navegar', rota: url });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Escuta mensagens do app principal (ex: para atualizar cache)
self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'SKIP_WAITING') self.skipWaiting();
});
```

### 2.4 Registro do SW e subscrição no frontend

```typescript
// src/services/webPushService.ts

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function registrarWebPush(uid: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await registro.update();

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') return;

  const subscricao = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Salvar token no Supabase (permite múltiplos dispositivos por usuário)
  await supabase.from('push_subscriptions').upsert({
    user_uid: uid,
    endpoint: subscricao.endpoint,
    p256dh: btoa(String.fromCharCode(...new Uint8Array(subscricao.getKey('p256dh')!))),
    auth: btoa(String.fromCharCode(...new Uint8Array(subscricao.getKey('auth')!))),
    user_agent: navigator.userAgent,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
}

export async function revogarWebPush(uid: string): Promise<void> {
  const registro = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await registro?.pushManager.getSubscription();
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
}
```

### 2.5 Endpoint Vercel para enviar push (sem Firebase)

```javascript
// api/send-push-notification.js — reescrito com web-push nativo
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Validação do token interno da Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  const { destinatario_uid, payload } = req.body;

  // Garantir que o destinatário é um usuário aprovado
  const { data: usuario } = await supabaseAdmin
    .from('users')
    .select('status')
    .eq('uid', destinatario_uid)
    .single();

  if (!usuario || usuario.status !== 'aprovado') {
    return res.status(403).json({ error: 'Usuário não autorizado.' });
  }

  // Busca todos os dispositivos registrados do usuário
  const { data: subscricoes } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_uid', destinatario_uid);

  const resultados = await Promise.allSettled(
    subscricoes.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  // Remove subscrições inválidas (ex: navegador desinstalado)
  for (let i = 0; i < resultados.length; i++) {
    if (resultados[i].status === 'rejected') {
      const status = resultados[i].reason?.statusCode;
      if (status === 404 || status === 410) {
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscricoes[i].endpoint);
      }
    }
  }

  res.status(200).json({ enviadas: resultados.filter(r => r.status === 'fulfilled').length });
}
```

### 2.6 Tabela de subscrições push no Supabase

```sql
-- Substitui o mecanismo de token único do save-push-token.js
-- Suporta múltiplos dispositivos por usuário
CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid     TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,     -- URL única de cada dispositivo/browser
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   TEXT,                     -- para identificar o dispositivo na UI
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_uid) WHERE ativo = TRUE;

-- RLS: usuário vê e gerencia apenas os próprios dispositivos
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_gerencia_proprias_subscricoes" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_uid);

CREATE POLICY "sistema_le_para_envio" ON push_subscriptions
  FOR SELECT USING (TRUE);  -- leitura pelo service_role key no backend
```

### 2.7 Prompt de permissão contextual (não susto)

Nunca pedir permissão push na chegada. Mostrar apenas após uma ação que se beneficia:

```jsx
// Exibir após o usuário realizar sua primeira proposta de aula
{mostrarPromptPush && (
  <Alert
    severity="info"
    action={
      <>
        <Button size="small" onClick={() => registrarWebPush(uid)}>Ativar</Button>
        <Button size="small" onClick={() => setMostrarPromptPush(false)}>Agora não</Button>
      </>
    }
  >
    Quer receber alertas quando sua proposta for aprovada ou recusada?
  </Alert>
)}
```

---

## Proposta 3 — Centro de Notificações In-App

### 3.1 Tabela `notificacoes` no Supabase

```sql
CREATE TABLE notificacoes (
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

CREATE INDEX idx_notificacoes_destinatario_nao_lida
  ON notificacoes(destinatario_uid, lida, criada_em DESC) WHERE lida = FALSE;

-- RLS
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_le_proprias" ON notificacoes
  FOR SELECT USING (auth.uid() = destinatario_uid);

CREATE POLICY "usuario_atualiza_proprias" ON notificacoes
  FOR UPDATE USING (auth.uid() = destinatario_uid);

CREATE POLICY "sistema_insere" ON notificacoes
  FOR INSERT WITH CHECK (TRUE); -- via service_role key
```

### 3.2 Hook de notificações com Supabase Realtime

```typescript
// src/hooks/useNotificacoes.ts
export function useNotificacoes(uid: string) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const naoLidas = notificacoes.filter(n => !n.lida).length;

  useEffect(() => {
    // Carga inicial
    supabase
      .from('notificacoes')
      .select('*')
      .eq('destinatario_uid', uid)
      .order('criada_em', { ascending: false })
      .limit(50)
      .then(({ data }) => setNotificacoes(data ?? []));

    // Realtime: nova notificação chega sem reload
    const channel = supabase
      .channel(`notificacoes-${uid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `destinatario_uid=eq.${uid}`,
      }, ({ new: nova }) => {
        setNotificacoes(prev => [nova, ...prev]);
        // Toast não-intrusivo
        toast.info(nova.titulo, { duration: 4000 });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [uid]);

  const marcarLida = async (id: string) => {
    await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('id', id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const marcarTodasLidas = async () => {
    await supabase
      .from('notificacoes')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('destinatario_uid', uid)
      .eq('lida', false);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  return { notificacoes, naoLidas, marcarLida, marcarTodasLidas };
}
```

### 3.3 Sino no AppBar

```jsx
// Em App.jsx — substituir o badge estático de avisos
const { naoLidas, notificacoes, marcarLida, marcarTodasLidas } = useNotificacoes(uid);

<IconButton onClick={() => setAbrirSino(true)}>
  <Badge badgeContent={naoLidas} color="error" max={99}>
    <Bell size={22} />
  </Badge>
</IconButton>

<Drawer anchor="right" open={abrirSino} onClose={() => setAbrirSino(false)}>
  <Box sx={{ width: 360, p: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h6">Notificações</Typography>
      {naoLidas > 0 && (
        <Button size="small" onClick={marcarTodasLidas}>Marcar todas como lidas</Button>
      )}
    </Stack>
    {notificacoes.length === 0
      ? <EmptyState title="Nenhuma notificação" />
      : notificacoes.map(n => (
          <NotificacaoItem key={n.id} notificacao={n} onLer={marcarLida} />
        ))
    }
  </Box>
</Drawer>
```

---

## Proposta 4 — Marcação de Usuários em Aulas Específicas

### 4.1 Diagnóstico

O campo `tecnicos[]` é para designação operacional (quem executa a aula). Não cobre:

- Professor que quer ser lembrado de uma aula do seu departamento
- Coordenador que quer monitorar aulas de um curso específico
- Técnico que quer acompanhar aulas em labs fora do seu principal

### 4.2 Tabela `aula_seguidores`

```sql
-- Separação clara: "designado" (operacional) vs "seguidor" (notificação)
CREATE TABLE aula_seguidores (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aula_id               UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
  user_uid              TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  motivo                TEXT NOT NULL CHECK (motivo IN (
                          'designado',   -- técnico responsável pela execução
                          'interesse',   -- acompanhamento voluntário
                          'coordenacao'  -- monitoramento pela coordenação
                        )),
  notificar_alteracoes  BOOLEAN NOT NULL DEFAULT TRUE,
  notificar_lembrete    BOOLEAN NOT NULL DEFAULT TRUE,
  lembrete_horas_antes  INTEGER NOT NULL DEFAULT 2
                        CHECK (lembrete_horas_antes IN (1, 2, 4, 12, 24)),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aula_id, user_uid)
);

CREATE INDEX idx_aula_seguidores_user ON aula_seguidores(user_uid);
CREATE INDEX idx_aula_seguidores_aula ON aula_seguidores(aula_id);

ALTER TABLE aula_seguidores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_gerencia_proprios" ON aula_seguidores
  FOR ALL USING (
    auth.uid() = user_uid
    OR EXISTS (
      SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'coordenador'
    )
  );
```

### 4.3 Botão "Seguir Aula" no AulaCard

```jsx
// AulaCard.jsx — disponível apenas para usuários autenticados e aprovados
{!isVisitante && isAprovado && (
  <Tooltip title={seguindo ? 'Parar de seguir' : 'Seguir esta aula'}>
    <IconButton
      size="small"
      onClick={() => setAbrirModalSeguir(true)}
      color={seguindo ? 'primary' : 'default'}
      aria-label={seguindo ? 'Parar de seguir aula' : 'Seguir aula'}
    >
      {seguindo ? <BellRing size={16} /> : <Bell size={16} />}
    </IconButton>
  </Tooltip>
)}

{/* Modal de configuração ao clicar em Seguir */}
<Dialog open={abrirModalSeguir} onClose={() => setAbrirModalSeguir(false)} maxWidth="xs" fullWidth>
  <DialogTitle>Acompanhar esta aula</DialogTitle>
  <DialogContent>
    <FormGroup>
      <FormControlLabel
        control={<Switch checked={notifAlteracoes} onChange={e => setNotifAlteracoes(e.target.checked)} />}
        label="Notificar se a aula for editada ou cancelada"
      />
      <FormControlLabel
        control={<Switch checked={notifLembrete} onChange={e => setNotifLembrete(e.target.checked)} />}
        label="Lembrete antes da aula"
      />
    </FormGroup>
    {notifLembrete && (
      <ToggleButtonGroup
        value={lembreteHoras}
        exclusive
        onChange={(_, v) => v && setLembreteHoras(v)}
        size="small"
        sx={{ mt: 1 }}
      >
        {[1, 2, 4, 12, 24].map(h => (
          <ToggleButton key={h} value={h}>{h}h antes</ToggleButton>
        ))}
      </ToggleButtonGroup>
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={pararDeSeguir} color="error">Parar de seguir</Button>
    <Button onClick={salvarSeguir} variant="contained">Salvar</Button>
  </DialogActions>
</Dialog>
```

### 4.4 Marcação em massa pelo Coordenador

Em `GerenciarAulasAvancado.jsx`, no modal de detalhes da aula, o coordenador pode:

- Ver a lista de seguidores atuais da aula (nome + motivo + canais ativos)
- Adicionar manualmente um usuário como seguidor (ex: professor sem acesso ao sistema)
- Remover seguidores
- Exportar lista de participantes/seguidores de um evento

### 4.5 Regras de seguimento automático por filtro

Além de seguir aulas uma a uma, o usuário pode configurar regras que adicionam aulas automaticamente:

```sql
CREATE TABLE regras_notificacao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid        TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  nome            TEXT NOT NULL,              -- "Todas as aulas no Lab Anatomia 1"
  laboratorios    TEXT[] NOT NULL DEFAULT '{}', -- [] = qualquer
  cursos          TEXT[] NOT NULL DEFAULT '{}', -- [] = qualquer
  tipos_atividade TEXT[] NOT NULL DEFAULT '{}', -- [] = qualquer
  dias_semana     INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=dom ... 6=sab
  turno           TEXT[] NOT NULL DEFAULT '{}',
  ativa           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE regras_notificacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_gerencia_proprias_regras" ON regras_notificacao
  FOR ALL USING (auth.uid() = user_uid);
```

Uma **Supabase Edge Function** ou trigger no banco avalia as regras ao inserir/editar uma aula e adiciona automaticamente o seguidor:

```sql
-- Trigger que adiciona seguidores por regra quando uma aula é criada/aprovada
CREATE OR REPLACE FUNCTION aplicar_regras_seguimento()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  regra RECORD;
BEGIN
  FOR regra IN
    SELECT * FROM regras_notificacao WHERE ativa = TRUE
  LOOP
    -- Verifica se a aula bate com os filtros da regra
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

CREATE TRIGGER trigger_regras_seguimento
  AFTER INSERT OR UPDATE OF status ON aulas
  FOR EACH ROW WHEN (NEW.status = 'aprovada')
  EXECUTE FUNCTION aplicar_regras_seguimento();
```

---

## Proposta 5 — Lembretes Programados com pg_cron

### 5.1 Habilitar pg_cron no Supabase

No painel do Supabase: **Database → Extensions → pg_cron → Enable**.

### 5.2 Função SQL de lembretes

```sql
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
    -- Janela: aula começa nos próximos X horas (com margem de 30min de tolerância)
    WHERE
      s.notificar_lembrete = TRUE
      AND a.status = 'aprovada'
      AND a."dataInicio" BETWEEN NOW() + (s.lembrete_horas_antes * INTERVAL '1 hour') - INTERVAL '30 minutes'
                             AND NOW() + (s.lembrete_horas_antes * INTERVAL '1 hour') + INTERVAL '30 minutes'
      -- Evitar lembrete duplicado nas últimas 25 minutos
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

-- Roda a cada 30 minutos
SELECT cron.schedule(
  'lembretes-aulas',
  '*/30 * * * *',
  $$ SELECT processar_lembretes_pendentes(); $$
);
```

### 5.3 Supabase Edge Function para despacho

A inserção na tabela `notificacoes` dispara um Database Webhook que chama uma Edge Function, que por sua vez despacha o Web Push e o Telegram:

```typescript
// supabase/functions/despachar-notificacao/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  const { record } = await req.json(); // nova linha de notificacoes
  const { destinatario_uid, tipo, titulo, corpo, aula_id, aviso_id } = record;

  // Buscar preferências do usuário
  const { data: pref } = await supabase
    .from('notificacao_preferencias')
    .select('*')
    .eq('user_uid', destinatario_uid)
    .single();

  if (!pref) return new Response('ok');

  // Verificar janela de silêncio
  if (estaNoSilencio(pref)) return new Response('ok');

  const payload = { title: titulo, body: corpo, data: { tipo, aulaId: aula_id, avisoId: aviso_id } };

  // Web Push
  if (pref.webpush_ativo) {
    await fetch(`${Deno.env.get('VERCEL_APP_URL')}/api/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('INTERNAL_API_SECRET')}`,
      },
      body: JSON.stringify({ destinatario_uid, payload }),
    });
  }

  // Telegram
  if (pref.telegram_ativo) {
    await fetch(`${Deno.env.get('VERCEL_APP_URL')}/api/send-telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('INTERNAL_API_SECRET')}`,
      },
      body: JSON.stringify({ destinatario_uid, payload }),
    });
  }

  return new Response('ok');
});
```

---

## Proposta 6 — Segurança: o que muda e o que não muda para Visitantes

### O que **não muda** para Visitantes

- Visitantes continuam sem acesso a qualquer funcionalidade de notificação
- A rota de configuração de preferências verifica `role !== null` e redireciona
- O botão "Seguir Aula" não renderiza para visitantes (`isVisitante` já existe no `AuthContext`)
- RLS no Supabase garante que visitantes não escrevem nada — independente do frontend

### Validação de perfil no endpoint Vercel

```javascript
// Verificação adicional em qualquer endpoint de notificação
const { data: usuario } = await supabaseAdmin
  .from('users')
  .select('status, role')
  .eq('uid', destinatario_uid)
  .single();

if (!usuario || usuario.status !== 'aprovado' || !usuario.role) {
  return res.status(403).json({ error: 'Usuário não autorizado a receber notificações.' });
}
```

### Silêncio respeitado no despacho — exceto urgentes

```typescript
function estaNoSilencio(pref: NotificacaoPreferencias, tipo: string): boolean {
  // Avisos urgentes sempre passam, independente do silêncio
  if (tipo === 'aviso_urgente') return false;

  if (!pref.silencio_ativo) return false;

  const agora = new Date();
  const diaSemana = agora.getDay(); // 0=dom, 6=sab

  if (pref.silencio_fds && (diaSemana === 0 || diaSemana === 6)) return true;

  const hora = agora.getHours() * 60 + agora.getMinutes();
  const [hIni, mIni] = pref.silencio_inicio.split(':').map(Number);
  const [hFim, mFim] = pref.silencio_fim.split(':').map(Number);
  const inicio = hIni * 60 + mIni;
  const fim = hFim * 60 + mFim;

  // Silêncio pode cruzar a meia-noite (ex: 22:00 → 07:00)
  if (inicio > fim) return hora >= inicio || hora < fim;
  return hora >= inicio && hora < fim;
}
```

---

## Proposta 7 — Tela de Configurações de Notificação

### 7.1 Nova seção em `ConfiguracoesPerfil.jsx`

```
📱 Notificações
│
├── 📨 Telegram
│   ├── Status: ● Conectado como @usuario  |  ○ Não conectado
│   ├── [Conectar Telegram]  /  [Desconectar]
│   ├── Toggle: Ativar notificações por Telegram
│   └── Eventos (checkboxes):
│       ├── ☑ Aula adicionada
│       ├── ☑ Aula editada
│       ├── ☑ Aula excluída
│       ├── ☑ Evento de manutenção
│       ├── ☑ Aviso urgente
│       ├── ☐ Aviso importante
│       ├── ☐ Aviso normal
│       └── [só técnico] ☑ Proposta aprovada / rejeitada
│
├── 🔔 Notificações no Navegador (Web Push)
│   ├── Status: [Ativas] / [Bloqueadas] / [Não configuradas]
│   ├── [Ativar] / [Revogar]
│   ├── Dispositivos registrados: [lista com botão de remover por dispositivo]
│   └── (mesmos eventos do Telegram)
│
├── ⏰ Lembretes de Aulas
│   ├── Toggle: Receber lembretes antes das aulas que acompanho
│   └── Antecedência padrão: [1h] [2h] [4h] [12h] [24h]
│
├── 🔍 Filtros de Escopo
│   ├── Laboratórios de interesse: [multi-select — "Todos" se vazio]
│   └── Cursos de interesse: [multi-select — "Todos" se vazio]
│
└── 🌙 Horário de Silêncio (Não Perturbe)
    ├── Toggle: Ativar silêncio programado
    ├── De: [22:00] Até: [07:00]
    ├── ☑ Silenciar nos fins de semana
    └── ⚠ Avisos urgentes sempre são entregues, mesmo no silêncio
```

### 7.2 Aba "Aulas que Acompanho"

Nova aba em "Minhas Designações" ou sub-seção em "Perfil":

```
📌 Aulas que Acompanho
│
├── Lista (ordenada por data):
│   ┌─────────────────────────────────────────────────────┐
│   │ 🔔 Anatomia Humana — Lab Anatomia 1 — 20/09 07:00  │
│   │    Lembrete: 2h antes  ·  Alterações: sim          │
│   │    [⚙ Configurar]  [✕ Parar de seguir]             │
│   └─────────────────────────────────────────────────────┘
│
└── 📋 Minhas Regras de Seguimento Automático
    ├── [+ Nova Regra]
    └── Lista de regras ativas com toggle on/off e [✏ Editar] [🗑 Excluir]
```

---

## Proposta 8 — Consolidação Técnica e Arquitetura Final

### 8.1 Unificar os dois NotificadorTelegram

Manter apenas `src/services/NotificadorTelegram.ts`. O arquivo em `src/ia-estruturada/` deve ser removido e todos os imports atualizados.

### 8.2 Novo `notificationService.ts` — orquestrador central

```typescript
// src/services/notificationService.ts
import { supabase } from '../supabaseConfig';

class NotificationService {

  // Ponto de entrada único para qualquer evento do sistema
  async disparar(
    evento: EventoNotificacao,
    tipo: TipoNotificacao,
    filtro?: FiltroDestinatarios
  ): Promise<void> {
    const destinatarios = await this.resolverDestinatarios(evento, filtro);
    const preferencias = await this.carregarPreferencias(destinatarios.map(d => d.uid));

    for (const pref of preferencias) {
      if (!this.aceitaEvento(pref, tipo)) continue;
      if (estaNoSilencio(pref, tipo)) continue;

      const payload = this.montarPayload(evento, tipo);

      // Registra in-app (sempre, se inapp_ativo)
      if (pref.inapp_ativo) {
        await this.registrarInApp(pref.user_uid, payload, evento);
      }
      // Web Push + Telegram são disparados pela Edge Function
      // ao detectar o INSERT na tabela notificacoes via Database Webhook
    }
  }

  private async resolverDestinatarios(
    evento: EventoNotificacao,
    filtro?: FiltroDestinatarios
  ): Promise<{ uid: string }[]> {
    // 1. Seguidores diretos da aula
    // 2. Usuários com regra que bate com o lab/curso
    // 3. Coordenadores (para eventos urgentes)
    // ...
  }
}

export const notificationService = new NotificationService();
```

### 8.3 Tabela de preferências — schema completo

```sql
CREATE TABLE notificacao_preferencias (
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

-- RLS: cada usuário gerencia apenas as próprias preferências
ALTER TABLE notificacao_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_gerencia_proprias_prefs" ON notificacao_preferencias
  FOR ALL USING (auth.uid() = user_uid);
```

### 8.4 Arquivos a remover / renomear

| Arquivo atual | Ação | Substituto |
|---|---|---|
| `public/firebase-messaging-sw.js` | **Remover** | `public/sw.js` (puro, sem Firebase) |
| `src/ia-estruturada/NotificadorTelegram.js` | **Remover** | `src/services/NotificadorTelegram.ts` |
| `api/save-push-token.js` | **Reescrever** | Salvar em `push_subscriptions` no Supabase |
| `api/send-push-notification.js` | **Reescrever** | Usar `web-push` + VAPID, sem Firebase Admin SDK |
| `src/firebaseConfig.js` | Avaliar remoção total se não houver outro uso | — |

### 8.5 Dependências a adicionar/remover

```bash
# Adicionar
npm install web-push        # envio VAPID no backend Vercel

# Remover (se não houver outro uso do Firebase no projeto)
npm uninstall firebase
```

---

## Roadmap de Implementação

| Prioridade | Item | Esforço | Dependência |
|:---:|---|:---:|---|
| 🔴 1 | Corrigir Telegram: buscar `telegram_chat_id` do usuário no Supabase | Baixo | — |
| 🔴 2 | Unificar `NotificadorTelegram` em `src/services/` | Baixo | — |
| 🔴 3 | Reescrever Web Push: SW puro (`sw.js`) + `web-push` VAPID na Vercel | Médio | — |
| 🔴 4 | Criar tabela `push_subscriptions` + atualizar `save-push-token.js` | Baixo | Item 3 |
| 🔴 5 | Criar tabela `notificacao_preferencias` + RLS | Baixo | Supabase |
| 🟡 6 | Criar tabela `notificacoes` + hook Realtime + sino in-app | Médio | Item 5 |
| 🟡 7 | Tela de preferências de notificação em `ConfiguracoesPerfil` | Médio | Item 5 |
| 🟡 8 | Fluxo self-service de vinculação Telegram (código temporário + bot webhook) | Médio | Bot Telegram |
| 🟡 9 | Criar tabela `aula_seguidores` + botão "Seguir Aula" no AulaCard | Médio | — |
| 🟡 10 | Supabase Database Webhook → Edge Function de despacho (push + Telegram) | Médio | Itens 3, 5, 6 |
| 🟢 11 | Regras de seguimento automático + trigger SQL | Alto | Item 9 |
| 🟢 12 | Lembretes via `pg_cron` no Supabase | Alto | Itens 6 e 9 |
| 🟢 13 | Comandos interativos no bot Telegram (`/hoje`, `/pausar`, etc.) | Alto | Item 8 |
| 🟢 14 | Aprovação express via botão na notificação Web Push | Alto | Itens 3 e 6 |

---

## Resumo por Perfil de Usuário

| Recurso | Visitante | Técnico | Coordenador |
|---|:---:|:---:|:---:|
| Ver notificações in-app | ✕ | ✅ | ✅ |
| Receber Web Push (VAPID) | ✕ | ✅ | ✅ |
| Múltiplos dispositivos push | ✕ | ✅ | ✅ |
| Receber Telegram individual | ✕ | ✅ | ✅ |
| Vincular Telegram self-service | ✕ | ✅ | ✅ |
| Comandos interativos no bot | ✕ | ✅ | ✅ |
| Configurar preferências | ✕ | ✅ | ✅ |
| Silêncio programado | ✕ | ✅ | ✅ |
| Seguir aulas específicas | ✕ | ✅ | ✅ |
| Criar regras automáticas | ✕ | ✅ | ✅ |
| Ver seguidores de uma aula | ✕ | Próprias | Todas |
| Adicionar seguidor manualmente | ✕ | ✕ | ✅ |
| Aprovação express via push | ✕ | ✕ | ✅ |

---

*Documento elaborado com base na análise direta do código-fonte do CronoLab: `src/services/NotificadorTelegram.ts`, `api/send-notification.js`, `api/send-push-notification.js`, `api/save-push-token.js`, `public/firebase-messaging-sw.js`, `src/pages/Perfil/ConfiguracoesPerfil.jsx`, schema em `scripts/schema.sql`, e documentação em `docs/GUIA_NOTIFICACOES_TELEGRAM.md` e `docs/IMPLEMENTACAO_NOTIFICACOES.md`.*
