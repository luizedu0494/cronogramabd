# CronoLab — Análise e Proposta: App Mobile Nativo + Sistema de Notificações e Grupos

> Documento técnico elaborado a partir da leitura direta do código-fonte do projeto (React 19 + Vite + Supabase + Vercel).  
> Foco em três eixos: **App Mobile Nativo**, **Sistema de Notificações Próprio** e **Grupos de Usuários com Designação Inteligente**.

---

## Sumário

1. [Diagnóstico do Estado Atual](#1-diagnóstico-do-estado-atual)
2. [Eixo 1 — App Mobile: PWA Melhorado ou App Nativo?](#2-eixo-1--app-mobile-pwa-melhorado-ou-app-nativo)
3. [Recomendação: React Native com Expo](#3-recomendação-react-native-com-expo)
4. [Estratégia de Código Compartilhado](#4-estratégia-de-código-compartilhado)
5. [Eixo 2 — Sistema de Notificações Próprio (sem Telegram)](#5-eixo-2--sistema-de-notificações-próprio-sem-telegram)
6. [Eixo 3 — Grupos de Usuários e Designação Inteligente](#6-eixo-3--grupos-de-usuários-e-designação-inteligente)
7. [Fluxo Completo: Coordenador Designa → Técnico Recebe](#7-fluxo-completo-coordenador-designa--técnico-recebe)
8. [Schema SQL Adicional Necessário](#8-schema-sql-adicional-necessário)
9. [Roadmap de Implementação](#9-roadmap-de-implementação)
10. [Comparativo de Abordagens Mobile](#10-comparativo-de-abordagens-mobile)
11. [Resumo Executivo](#11-resumo-executivo)

---

## 1. Diagnóstico do Estado Atual

### O que foi encontrado no código

| Área | Estado Atual | Problema |
|---|---|---|
| **PWA** | `manifest.json` configurado, SW puro (`public/sw.js`) implementado, `PromptInstalacaoPWA.jsx` existe | Instalação depende do usuário entender o conceito de PWA; iOS tem suporte limitado a Web Push |
| **Notificações Telegram** | `NotificadorTelegram.ts` chama um `TELEGRAM_CHAT_ID` **fixo e global** | Toda notificação vai para um único destino; o campo `telegram_chat_id` da tabela `users` nunca é consultado |
| **Web Push** | `public/sw.js` já é puro (W3C VAPID, sem Firebase) ✅ | O `api/save-push-token.js` ainda usa estrutura de token único por usuário, sem suporte a múltiplos dispositivos |
| **Grupos** | `GerenciarGrupos.jsx` existe e a coleção `grupos` tem `{id, nome, membros[]}` | Grupos são apenas listas de nomes — não há disparo de notificação ao grupo, nem filtro por laboratório/área |
| **Designação** | `DesignarTecnicosModal.jsx` lista técnicos e permite selecionar + aplicar grupo | Ao confirmar designação, **não há notificação push/in-app para o técnico designado** — apenas Telegram global |
| **Centro de notificações** | Não existe — notificação enviada e não vista some para sempre | Sem histórico, sem badge no sino, sem leitura |
| **MinhasDesignacoes.jsx** | Tela existe para o técnico ver suas designações | Dados carregados sob demanda; sem atualização em tempo real via Realtime |

### Resumo dos problemas-raiz

**Problema 1 — Telegram como canal único e global**  
O `TELEGRAM_CHAT_ID` é uma constante hardcoded. Qualquer evento notifica um grupo ou o chat do desenvolvedor, não o técnico correto. O campo `telegram_chat_id` já existe em `users` mas nunca é lido antes do envio.

**Problema 2 — Designação sem feedback ao designado**  
`DesignarTecnicosModal` faz o `update` no Supabase mas não dispara notificação push, in-app ou push native ao técnico selecionado. O técnico precisa entrar no sistema para descobrir que foi designado.

**Problema 3 — Grupos são listas estáticas**  
`GerenciarGrupos.jsx` cria grupos com nome e lista de membros, mas não há mecanismo para notificar todos os membros de um grupo quando o coordenador escolhe esse grupo na designação.

**Problema 4 — PWA tem limitações estruturais em iOS**  
Safari (iOS) não suporta Web Push via PWA até iOS 16.4+, e mesmo assim a experiência de instalação é obscura. Usuários que usam iPhone sem saber instalar o PWA ficam sem notificações.

**Problema 5 — Sem app nas lojas**  
Não há presença na App Store ou Google Play, o que reduz confiança institucional e dificulta adoção por técnicos e coordenadores menos técnicos.

---

## 2. Eixo 1 — App Mobile: PWA Melhorado ou App Nativo?

### Opção A — Melhorar o PWA atual

**O que já funciona:**
- `manifest.json` com `display: "standalone"` e cores da marca configuradas
- `public/sw.js` puro com suporte a Web Push VAPID, ações de notificação, snooze
- `PromptInstalacaoPWA.jsx` já existe (prompt de instalação contextual)
- Tema responsivo com `useMediaQuery` em alguns componentes

**O que falta para o PWA ser completo:**
- Correção dos menus mobile (análise `analise-alinhamento-menus-mobile.md` já documenta os problemas)
- `BottomNavigation` + `Drawer` lateral (hoje é dropdown — inadequado para mobile)
- Modais em `fullScreen` no mobile (hoje são `Dialog` centralizados que cortam em telas pequenas)
- Ícones PWA em todos os tamanhos (`/icons/icon-192x192.png` e `/icons/badge-72x72.png` referenciados no SW mas precisam existir)
- Estratégia de cache offline para o cronograma

**Limitação crítica do PWA:**  
No iOS (Safari), Web Push só funciona se o app for instalado como PWA via "Adicionar à Tela Inicial". Para usuários que acessam pelo navegador sem instalar, não há notificação push. Isso é um bloqueio real para um sistema de avisos críticos como designação de técnicos.

### Opção B — App Nativo com React Native + Expo

**Vantagens sobre o PWA:**
- Push Notifications nativas via APNs (iOS) e FCM (Android) — funcionam mesmo com app em segundo plano ou fechado
- Presença nas lojas (App Store + Google Play) — credibilidade institucional
- Acesso a câmera, biometria (Face ID / Touch ID), armazenamento local, deep links
- Experiência de navegação nativa (gestos, animações de tela)
- Expo EAS Build gera o `.apk`/`.ipa` sem precisar de Mac para iOS

**Desvantagem principal:**
- Requer reescrever os componentes de UI (MUI não funciona em React Native — precisa de substituição)
- Ciclo de desenvolvimento mais longo para a primeira versão

### Opção C — Abordagem Híbrida (recomendada)

Manter o PWA melhorado para acesso rápido pelo navegador **e** criar um app Expo para push nativo e experiência móvel de alta qualidade. Os dois consomem a mesma API Supabase. A lógica de negócio (hooks, services, utils) é compartilhada via uma pasta `packages/core` em monorepo.

---

## 3. Recomendação: React Native com Expo

### Por que Expo e não Flutter, Ionic ou Capacitor?

| Critério | Expo (React Native) | Capacitor (web → nativo) | Flutter | Ionic |
|---|---|---|---|---|
| **Reuso de lógica JS** | ✅ Total (hooks, services, Supabase) | ✅ Total | ❌ Dart | ⚠️ Parcial |
| **Reuso de componentes UI** | ❌ UI precisa ser reescrita | ✅ Usa o HTML/CSS atual | ❌ | ✅ |
| **Push nativo real** | ✅ APNs + FCM nativo | ⚠️ Via plugin | ✅ | ⚠️ Via plugin |
| **Performance nativa** | ✅ | ⚠️ WebView | ✅ | ⚠️ WebView |
| **Distribuição nas lojas** | ✅ EAS Build | ✅ | ✅ | ✅ |
| **Curva de aprendizado** | Baixa (já usa React) | Muito baixa | Alta | Baixa |
| **Ecossistema** | Muito maduro | Maduro | Maduro | Maduro |

**Conclusão:** O Expo é a melhor escolha porque a equipe já conhece React e toda a lógica JavaScript (Supabase client, hooks de dados, serviços de notificação) é 100% reutilizável. Só a camada de UI precisa ser adaptada.

> **Nota sobre Capacitor:** Se a prioridade for velocidade de entrega e não experiência nativa perfeita, o Capacitor permite empacotar o site React atual como app nativo com mudanças mínimas. Push nativo funciona via `@capacitor/push-notifications`. É um caminho válido para uma primeira versão nas lojas em 2–4 semanas.

### Estrutura de Monorepo sugerida

```
cronolab/
├── apps/
│   ├── web/                    ← Projeto React atual (Vite)
│   │   ├── src/
│   │   ├── public/
│   │   └── vite.config.js
│   └── mobile/                 ← Novo projeto Expo
│       ├── app/                ← Expo Router (file-based routing)
│       │   ├── (auth)/
│       │   │   └── login.tsx
│       │   ├── (tabs)/
│       │   │   ├── calendario.tsx
│       │   │   ├── designacoes.tsx
│       │   │   ├── notificacoes.tsx
│       │   │   └── perfil.tsx
│       │   └── _layout.tsx
│       ├── components/         ← Componentes RN específicos
│       ├── app.json
│       └── package.json
└── packages/
    └── core/                   ← Lógica compartilhada
        ├── src/
        │   ├── services/
        │   │   ├── aulaService.ts       ← igual ao web
        │   │   ├── notificationService.ts
        │   │   └── userService.ts
        │   ├── hooks/
        │   │   ├── useAulas.ts          ← igual ao web
        │   │   ├── useNotificacoes.ts
        │   │   └── useDesignacoes.ts
        │   ├── types/
        │   │   └── index.ts             ← tipos compartilhados
        │   └── supabaseConfig.ts        ← cliente Supabase único
        └── package.json
```

### Dependências do app Expo

```bash
# Inicializar
npx create-expo-app@latest apps/mobile --template blank-typescript

# Navegação
npx expo install expo-router

# Push nativo
npx expo install expo-notifications expo-device expo-constants

# Supabase (mesmo do web, funciona em RN)
npm install @supabase/supabase-js

# Storage seguro para tokens de sessão
npx expo install expo-secure-store

# UI (substitui MUI no mobile)
npm install @rneui/themed @rneui/base
# ou
npm install react-native-paper

# Ícones (compatíveis com Expo)
npx expo install @expo/vector-icons
```

### Configuração de Push no Expo (`app.json`)

```json
{
  "expo": {
    "name": "CronoLab",
    "slug": "cronolab",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png", "backgroundColor": "#0B0F18" },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#1E7EC8",
          "defaultChannel": "cronolab-designacoes",
          "sounds": ["./assets/notification.wav"]
        }
      ]
    ],
    "android": {
      "package": "br.edu.cesmac.cronolab",
      "googleServicesFile": "./google-services.json",
      "permissions": ["RECEIVE_BOOT_COMPLETED", "VIBRATE"]
    },
    "ios": {
      "bundleIdentifier": "br.edu.cesmac.cronolab",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

### Serviço de Push no App Mobile (`packages/core/src/services/pushService.ts`)

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../supabaseConfig';

// Configurar comportamento das notificações quando app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registrarTokenPushNativo(userUid: string): Promise<string | null> {
  if (!Device.isDevice) return null; // simulador não suporta push

  // Solicitar permissão
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Canal Android (obrigatório no Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('cronolab-designacoes', {
      name: 'Designações',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E7EC8',
    });
    await Notifications.setNotificationChannelAsync('cronolab-avisos', {
      name: 'Avisos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Obter token Expo Push
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'SEU_EXPO_PROJECT_ID', // do app.json > extra > eas > projectId
  });

  const token = tokenData.data;

  // Salvar no Supabase junto com info do dispositivo
  await supabase.from('push_tokens_mobile').upsert({
    user_uid: userUid,
    expo_token: token,
    platform: Platform.OS,
    device_name: Device.deviceName,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'expo_token' });

  return token;
}
```

### Tela de Notificações no App (`apps/mobile/app/(tabs)/notificacoes.tsx`)

```tsx
import { useNotificacoes } from '@cronolab/core/hooks/useNotificacoes';
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function NotificacoesScreen() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes(uid);

  return (
    <View style={styles.container}>
      {naoLidas > 0 && (
        <TouchableOpacity style={styles.marcarTodas} onPress={marcarTodasLidas}>
          <Text style={styles.marcarTodasTexto}>Marcar todas como lidas ({naoLidas})</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notificacoes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.lida && styles.itemNaoLido]}
            onPress={() => marcarLida(item.id)}
          >
            <Text style={styles.titulo}>{item.titulo}</Text>
            <Text style={styles.corpo}>{item.corpo}</Text>
            <Text style={styles.tempo}>{formatarTempo(item.criada_em)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

---

## 4. Estratégia de Código Compartilhado

O principal ganho do monorepo é que os seguintes arquivos são **idênticos** no web e no mobile:

### Compartilhado 100% (zero alteração)

```
packages/core/
├── src/
│   ├── supabaseConfig.ts          ← cliente Supabase (funciona em RN)
│   ├── types/index.ts             ← interfaces Aula, Tecnico, Notificacao, Grupo
│   ├── services/
│   │   ├── aulaService.ts         ← CRUD de aulas no Supabase
│   │   ├── userService.ts         ← buscar usuários, atualizar perfil
│   │   ├── notificationService.ts ← despachar notificações (canal agnóstico)
│   │   └── grupoService.ts        ← CRUD de grupos + notificar grupo
│   ├── hooks/
│   │   ├── useAulas.ts            ← busca + realtime de aulas
│   │   ├── useNotificacoes.ts     ← centro de notificações + realtime
│   │   ├── useDesignacoes.ts      ← designações do técnico logado
│   │   └── useGrupos.ts           ← grupos do coordenador
│   └── utils/
│       ├── dateHelper.ts          ← formatação de datas
│       └── conflitoUtils.ts       ← verificação de conflitos de horário
```

### Específico por plataforma (precisa de versão separada)

| Arquivo | Web (MUI) | Mobile (RN) |
|---|---|---|
| Componentes de UI | `Dialog`, `Button`, `List` MUI | `Modal`, `TouchableOpacity`, `FlatList` RN |
| Navegação | React Router | Expo Router |
| Push registration | `webPushService.ts` (VAPID) | `pushService.ts` (Expo Notifications) |
| Storage de sessão | `localStorage` / Supabase Auth | `expo-secure-store` |
| Tema | `theme.js` MUI | `StyleSheet` RN |

---

## 5. Eixo 2 — Sistema de Notificações Próprio (sem Telegram)

### 5.1 Arquitetura do sistema de notificações

O sistema proposto tem **três camadas** independentes que disparam em paralelo:

```
Evento no Supabase (INSERT/UPDATE)
          │
          ▼
  notificationService.ts (despachar)
          │
    ┌─────┼──────────────┐
    ▼     ▼              ▼
In-App  Web Push    Push Nativo
(tabela (VAPID via   (Expo Push
notifi-  Vercel)      via Supabase
cacoes)              Edge Function)
```

**Regra:** a tabela `notificacoes` é sempre populada. O Web Push e o Push Nativo são disparados **em consequência** via Database Webhook, nunca diretamente pelos componentes React. Isso elimina o padrão atual de chamar `notificarTelegramEvento()` dentro de `handleSubmit()`.

### 5.2 Tabela de tokens para o app mobile

```sql
-- Complementar às push_subscriptions (Web VAPID) já propostas
CREATE TABLE push_tokens_mobile (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid     TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  expo_token   TEXT NOT NULL UNIQUE,   -- token Expo Push "ExponentPushToken[...]"
  platform     TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name  TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user ON push_tokens_mobile(user_uid) WHERE ativo = TRUE;

ALTER TABLE push_tokens_mobile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_gerencia_proprios_tokens" ON push_tokens_mobile
  FOR ALL USING (auth.uid() = user_uid);
```

### 5.3 Edge Function unificada de despacho

A Edge Function substitui o `api/send-push-notification.js` atual e adiciona suporte ao Expo:

```typescript
// supabase/functions/despachar-notificacao/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  const { record: notificacao } = await req.json(); // payload do Database Webhook

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const uid = notificacao.destinatario_uid;

  // 1. Buscar tokens do usuário (web VAPID + Expo mobile)
  const [{ data: webSubs }, { data: mobileTokens }] = await Promise.all([
    supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_uid', uid).eq('ativo', true),
    supabase.from('push_tokens_mobile').select('expo_token').eq('user_uid', uid).eq('ativo', true),
  ]);

  const payload = {
    title: notificacao.titulo,
    body: notificacao.corpo,
    data: {
      tipo: notificacao.tipo,
      aulaId: notificacao.aula_id,
      avisoId: notificacao.aviso_id,
    },
  };

  // 2. Enviar Web Push (VAPID) — para quem acessar pelo navegador/PWA
  if (webSubs?.length) {
    await fetch(`${Deno.env.get('VERCEL_URL')}/api/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('INTERNAL_API_SECRET')}`,
      },
      body: JSON.stringify({ destinatario_uid: uid, payload }),
    });
  }

  // 3. Enviar Push Nativo via Expo — para quem tem o app instalado
  if (mobileTokens?.length) {
    const messages = mobileTokens.map(t => ({
      to: t.expo_token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      channelId: notificacao.tipo.startsWith('designa') ? 'cronolab-designacoes' : 'cronolab-avisos',
      badge: 1,
    }));

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    });
  }

  return new Response('ok', { status: 200 });
});
```

### 5.4 Tipos de notificação para designação

Os tipos abaixo são os que precisam funcionar imediatamente ao coordenador fazer a ação:

| Tipo | Gatilho | Destinatário | Canal |
|---|---|---|---|
| `designacao_tecnico` | Coordenador designa técnico a uma aula | Técnico designado | In-app + Push nativo + Web Push |
| `designacao_grupo` | Coordenador aplica grupo a uma aula | Todos os membros do grupo | In-app + Push nativo + Web Push |
| `remocao_designacao` | Coordenador remove técnico de aula | Técnico removido | In-app + Push nativo |
| `aprovacao_proposta` | Proposta aprovada/rejeitada | Quem propôs | In-app + Push nativo |
| `aviso_urgente` | Coordenador publica aviso urgente | Todos aprovados | In-app + Push nativo + Web Push |
| `lembrete_aula` | pg_cron: X horas antes da aula | Técnicos designados | In-app + Push nativo |
| `aula_editada` | Aula designada ao técnico foi editada | Técnico designado | In-app + Push nativo |
| `aula_cancelada` | Aula designada ao técnico foi cancelada | Técnico designado | In-app + Push nativo (urgente) |

### 5.5 Preferências de notificação por usuário

```sql
CREATE TABLE notificacao_preferencias (
  user_uid              TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  -- Canais
  push_web_ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  push_mobile_ativo     BOOLEAN NOT NULL DEFAULT TRUE,
  -- Tipos
  designacao_ativo      BOOLEAN NOT NULL DEFAULT TRUE,  -- sempre deve ficar ativo
  aviso_urgente_ativo   BOOLEAN NOT NULL DEFAULT TRUE,
  aviso_normal_ativo    BOOLEAN NOT NULL DEFAULT TRUE,
  aula_editada_ativo    BOOLEAN NOT NULL DEFAULT TRUE,
  lembrete_ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  lembrete_horas_antes  INTEGER NOT NULL DEFAULT 2 CHECK (lembrete_horas_antes IN (1, 2, 4, 12, 24)),
  -- Filtros de interesse (vazio = todos)
  labs_interesse        TEXT[] NOT NULL DEFAULT '{}',
  -- Horário silencioso
  silencio_inicio       TIME,   -- ex: '22:00'
  silencio_fim          TIME,   -- ex: '07:00'
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir preferências padrão ao aprovar usuário
CREATE OR REPLACE FUNCTION criar_preferencias_usuario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status <> 'aprovado' THEN
    INSERT INTO notificacao_preferencias (user_uid)
    VALUES (NEW.uid)
    ON CONFLICT (user_uid) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_criar_preferencias
  AFTER UPDATE OF status ON users
  FOR EACH ROW EXECUTE FUNCTION criar_preferencias_usuario();
```

---

## 6. Eixo 3 — Grupos de Usuários e Designação Inteligente

### 6.1 Diagnóstico do sistema atual de grupos

O `GerenciarGrupos.jsx` existente já tem a estrutura base certa, mas tem três lacunas críticas:

**Lacuna A — Grupos não têm área/laboratório associado**  
Um grupo "Anatomia" deveria ter metadados: `laboratórios_associados: ['Lab Anatomia 1', 'Lab Anatomia 2']`. Isso permite notificar automaticamente o grupo certo quando um evento ocorre nesses labs, sem que o coordenador precise lembrar qual grupo é responsável.

**Lacuna B — Ao aplicar grupo na designação, nenhum membro é notificado**  
`DesignarTecnicosModal` tem o `Select` de grupos e o `handleApplyGrupo` que preenche os checkboxes, mas após o `handleConfirmarDesignacao`, a notificação não é disparada individualmente para cada membro do grupo.

**Lacuna C — Grupos não aparecem em `MinhasDesignacoes.jsx`**  
O técnico vê suas designações individuais, mas se foi designado via grupo, a visibilidade é a mesma — o que é correto. O problema é que não há push para avisar que foi incluído.

### 6.2 Schema melhorado para grupos

```sql
-- Tabela principal de grupos (evolução da coleção Firestore 'grupos')
CREATE TABLE grupos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                  TEXT NOT NULL,
  descricao             TEXT,
  cor                   TEXT DEFAULT '#1E7EC8',  -- para identificação visual
  labs_associados       TEXT[] NOT NULL DEFAULT '{}', -- labs que este grupo gerencia
  criado_por_uid        TEXT NOT NULL REFERENCES users(uid),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membros do grupo (substitui o array embedado)
CREATE TABLE grupo_membros (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id    UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  user_uid    TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  adicionado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grupo_id, user_uid)
);

CREATE INDEX idx_grupo_membros_grupo ON grupo_membros(grupo_id);
CREATE INDEX idx_grupo_membros_user  ON grupo_membros(user_uid);

-- RLS: técnicos veem grupos dos quais fazem parte; coordenadores veem tudo
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coordenador_gerencia_grupos" ON grupos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'coordenador')
  );

CREATE POLICY "tecnico_ve_proprios_grupos" ON grupos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM grupo_membros WHERE grupo_id = grupos.id AND user_uid = auth.uid())
  );

CREATE POLICY "coordenador_gerencia_membros" ON grupo_membros
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'coordenador')
  );

CREATE POLICY "tecnico_ve_proprios_membros" ON grupo_membros
  FOR SELECT USING (user_uid = auth.uid());
```

### 6.3 UI melhorada para gerenciar grupos (`GerenciarGrupos.jsx`)

O componente atual já tem a lista e o modal de criação. As melhorias são:

```jsx
// Melhorias no modal de criação/edição de grupo
<Dialog open={openModal} fullWidth maxWidth="sm">
  <DialogTitle>{editando ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
  <DialogContent>
    {/* Campo de nome — já existe */}
    <TextField label="Nome do grupo" fullWidth sx={{ mb: 2 }} />

    {/* NOVO: Descrição do grupo */}
    <TextField label="Descrição (opcional)" fullWidth multiline rows={2} sx={{ mb: 2 }} />

    {/* NOVO: Laboratórios associados ao grupo */}
    <Autocomplete
      multiple
      options={LISTA_LABORATORIOS}
      getOptionLabel={lab => lab.name}
      renderInput={params => <TextField {...params} label="Laboratórios gerenciados por este grupo" />}
      sx={{ mb: 2 }}
    />

    {/* NOVO: Cor de identificação */}
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption">Cor de identificação</Typography>
      <Stack direction="row" gap={1} mt={1}>
        {['#1E7EC8', '#00C853', '#F5C518', '#E53935', '#9C27B0'].map(cor => (
          <Box
            key={cor}
            onClick={() => setCor(cor)}
            sx={{
              width: 32, height: 32, borderRadius: '50%',
              bgcolor: cor, cursor: 'pointer',
              border: corSelecionada === cor ? '3px solid white' : '3px solid transparent',
              outline: corSelecionada === cor ? `2px solid ${cor}` : 'none',
            }}
          />
        ))}
      </Stack>
    </Box>

    <Divider sx={{ mb: 2 }} />
    <Typography variant="subtitle2" gutterBottom>Membros do grupo</Typography>

    {/* MELHORADO: Busca de técnicos com avatar e info de labs atuais */}
    <Autocomplete
      multiple
      options={tecnicosDisponiveis}
      getOptionLabel={t => t.name}
      renderOption={(props, t) => (
        <li {...props}>
          <Avatar src={t.photo_url} sx={{ width: 28, height: 28, mr: 1 }} />
          <Box>
            <Typography variant="body2">{t.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t.grupos_atuais?.join(', ') || 'Sem grupo'}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={params => <TextField {...params} label="Adicionar técnicos" />}
    />
  </DialogContent>
</Dialog>
```

### 6.4 Designação com notificação imediata (`DesignarTecnicosModal.jsx`)

A maior mudança é que o `handleConfirmarDesignacao` precisa chamar o serviço de notificação após salvar:

```typescript
// src/services/grupoService.ts — novo serviço
export async function designarTecnicosComNotificacao(
  aulaId: string,
  aulaInfo: { assunto: string; laboratorio: string; dataInicio: string; horario: string },
  tecnicosUids: string[],
  viaGrupoId?: string
): Promise<void> {
  // 1. Buscar técnicos atuais para detectar quem foi adicionado/removido
  const { data: aulaAtual } = await supabase
    .from('aulas')
    .select('tecnicos')
    .eq('id', aulaId)
    .single();

  const tecnicosAnteriores: string[] = aulaAtual?.tecnicos ?? [];
  const adicionados = tecnicosUids.filter(uid => !tecnicosAnteriores.includes(uid));
  const removidos = tecnicosAnteriores.filter(uid => !tecnicosUids.includes(uid));

  // 2. Atualizar a aula no Supabase
  await supabase
    .from('aulas')
    .update({
      tecnicos: tecnicosUids,
      via_grupo_id: viaGrupoId ?? null,
    })
    .eq('id', aulaId);

  // 3. Notificar técnicos adicionados
  for (const uid of adicionados) {
    await supabase.from('notificacoes').insert({
      destinatario_uid: uid,
      tipo: 'designacao_tecnico',
      titulo: `🔬 Você foi designado para uma aula`,
      corpo: `${aulaInfo.assunto} — ${aulaInfo.laboratorio} · ${formatarDataHora(aulaInfo.dataInicio, aulaInfo.horario)}`,
      aula_id: aulaId,
    });
    // O Database Webhook dispara a Edge Function → Push nativo + Web Push
  }

  // 4. Notificar técnicos removidos
  for (const uid of removidos) {
    await supabase.from('notificacoes').insert({
      destinatario_uid: uid,
      tipo: 'remocao_designacao',
      titulo: `ℹ️ Sua designação foi alterada`,
      corpo: `Você foi removido de: ${aulaInfo.assunto} — ${aulaInfo.laboratorio}`,
      aula_id: aulaId,
    });
  }

  // 5. Se foi via grupo, registrar no log
  if (viaGrupoId) {
    await supabase.from('logs').insert({
      tipo: 'designacao_grupo',
      descricao: `Grupo aplicado à aula ${aulaId}. ${adicionados.length} técnicos adicionados.`,
      aula_id: aulaId,
      grupo_id: viaGrupoId,
    });
  }
}
```

### 6.5 Notificação ao grupo inteiro (`notificationService.ts`)

```typescript
// packages/core/src/services/notificationService.ts

export async function notificarGrupo(
  grupoId: string,
  notificacao: {
    tipo: TipoNotificacao;
    titulo: string;
    corpo: string;
    aula_id?: string;
    aviso_id?: string;
  }
): Promise<void> {
  // Buscar todos os membros ativos do grupo
  const { data: membros } = await supabase
    .from('grupo_membros')
    .select('user_uid')
    .eq('grupo_id', grupoId);

  if (!membros?.length) return;

  // Verificar preferências de cada membro antes de notificar
  const { data: preferencias } = await supabase
    .from('notificacao_preferencias')
    .select('user_uid, designacao_ativo, silencio_inicio, silencio_fim')
    .in('user_uid', membros.map(m => m.user_uid));

  const agoraHora = new Date().getHours();

  const destinatarios = membros.filter(m => {
    const pref = preferencias?.find(p => p.user_uid === m.user_uid);
    if (!pref?.designacao_ativo) return false;

    // Verificar horário silencioso
    if (pref.silencio_inicio && pref.silencio_fim) {
      const inicio = parseInt(pref.silencio_inicio.split(':')[0]);
      const fim = parseInt(pref.silencio_fim.split(':')[0]);
      if (inicio > fim) {
        // Silêncio atravessa meia-noite (ex: 22:00 → 07:00)
        if (agoraHora >= inicio || agoraHora < fim) return false;
      } else {
        if (agoraHora >= inicio && agoraHora < fim) return false;
      }
    }
    return true;
  });

  // Inserir uma notificação por membro (o Webhook cuida do push)
  const inserts = destinatarios.map(m => ({
    destinatario_uid: m.user_uid,
    ...notificacao,
  }));

  if (inserts.length > 0) {
    await supabase.from('notificacoes').insert(inserts);
  }
}
```

### 6.6 Tela do Coordenador: Selecionar grupo e notificar

```jsx
// No painel do coordenador — novo componente NotificarGrupo.jsx
function NotificarGrupo() {
  const [grupos, setGrupos] = useState([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState('aviso_normal');

  const handleEnviar = async () => {
    if (!grupoSelecionado || !mensagem.trim()) return;

    await notificarGrupo(grupoSelecionado.id, {
      tipo,
      titulo: `📢 ${grupoSelecionado.nome}: ${tipo === 'aviso_urgente' ? '⚠️ URGENTE' : 'Aviso'}`,
      corpo: mensagem,
    });

    setMensagem('');
    showSnackbar('Notificação enviada para o grupo!', 'success');
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Notificar Grupo</Typography>

      <Autocomplete
        options={grupos}
        getOptionLabel={g => g.nome}
        renderOption={(props, g) => (
          <li {...props}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: g.cor, mr: 1 }} />
            <Box>
              <Typography variant="body2">{g.nome}</Typography>
              <Typography variant="caption" color="text.secondary">
                {g.membros_count} membros · {g.labs_associados?.join(', ')}
              </Typography>
            </Box>
          </li>
        )}
        onChange={(_, val) => setGrupoSelecionado(val)}
        renderInput={params => <TextField {...params} label="Grupo destinatário" sx={{ mb: 2 }} />}
      />

      <ToggleButtonGroup value={tipo} exclusive onChange={(_, v) => v && setTipo(v)} sx={{ mb: 2 }}>
        <ToggleButton value="aviso_normal">Normal</ToggleButton>
        <ToggleButton value="aviso_importante">Importante</ToggleButton>
        <ToggleButton value="aviso_urgente">⚠️ Urgente</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        label="Mensagem"
        multiline
        rows={3}
        fullWidth
        value={mensagem}
        onChange={e => setMensagem(e.target.value)}
        sx={{ mb: 2 }}
      />

      {grupoSelecionado && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta notificação será enviada para {grupoSelecionado.membros_count} técnicos via push e in-app.
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleEnviar}
        disabled={!grupoSelecionado || !mensagem.trim()}
        fullWidth
      >
        Enviar para o grupo
      </Button>
    </Paper>
  );
}
```

### 6.7 Tela do Técnico: Minhas Designações com tempo real

```tsx
// MinhasDesignacoes.jsx — melhorado com Realtime e notificação in-app

function MinhasDesignacoes({ uid }) {
  const [designacoes, setDesignacoes] = useState([]);

  useEffect(() => {
    // Carga inicial
    supabase
      .from('aulas')
      .select('id, assunto, laboratorio, data_inicio, horario_slot, status, via_grupo_id, grupos(nome, cor)')
      .contains('tecnicos', [uid])
      .eq('status', 'aprovada')
      .gte('data_inicio', new Date().toISOString())
      .order('data_inicio')
      .then(({ data }) => setDesignacoes(data ?? []));

    // Realtime: nova designação chega sem reload
    const channel = supabase
      .channel(`designacoes-${uid}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'aulas',
        filter: `tecnicos=cs.{"${uid}"}`,
      }, ({ new: aula }) => {
        setDesignacoes(prev => {
          const existe = prev.find(d => d.id === aula.id);
          if (existe) return prev.map(d => d.id === aula.id ? aula : d);
          return [aula, ...prev]; // nova designação
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [uid]);

  return (
    <Container maxWidth="md">
      <Typography variant="h5" gutterBottom>Minhas Designações</Typography>
      {designacoes.length === 0
        ? <EmptyState title="Nenhuma aula designada" description="O coordenador ainda não te designou para nenhuma aula futura." />
        : designacoes.map(aula => (
            <Card key={aula.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">{aula.assunto}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      🏢 {aula.laboratorio} · 🕐 {aula.horario_slot}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      📅 {formatarData(aula.data_inicio)}
                    </Typography>
                  </Box>
                  {aula.grupos && (
                    <Chip
                      label={`Grupo: ${aula.grupos.nome}`}
                      size="small"
                      sx={{ bgcolor: aula.grupos.cor, color: 'white' }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          ))
      }
    </Container>
  );
}
```

---

## 7. Fluxo Completo: Coordenador Designa → Técnico Recebe

```
┌─────────────────────────────────────────────────────────┐
│                   COORDENADOR                           │
│                                                         │
│  GerenciarAulasAvancado → DesignarTecnicosModal         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Seleciona grupo "Anatomia" no dropdown       │   │
│  │    → handleApplyGrupo: marca checkboxes         │   │
│  │ 2. (opt) ajusta membros individualmente         │   │
│  │ 3. Clica "Confirmar"                            │   │
│  └─────────────────────────────────────────────────┘   │
│               │                                         │
│               ▼                                         │
│  designarTecnicosComNotificacao()                       │
│    ├─ UPDATE aulas SET tecnicos=[...], via_grupo_id=... │
│    └─ INSERT notificacoes (uma por técnico adicionado)  │
└─────────────────────────────────────────────────────────┘
                │
                │  Supabase Database Webhook
                ▼
┌─────────────────────────────────────────────────────────┐
│           Edge Function: despachar-notificacao          │
│                                                         │
│  Para cada notificação inserida:                        │
│  ├─ Busca push_subscriptions (web VAPID)                │
│  ├─ Busca push_tokens_mobile (Expo)                     │
│  ├─ Verifica preferências do usuário                    │
│  ├─ Envia Web Push (Vercel api/send-push-notification)  │
│  └─ Envia Expo Push (exp.host/api/v2/push/send)         │
└─────────────────────────────────────────────────────────┘
                │                    │
        Web/PWA │                    │ App Mobile
                ▼                    ▼
┌──────────────────┐    ┌──────────────────────────────┐
│ Sino 🔔 no        │    │ Notificação nativa no         │
│ AppBar pisca      │    │ celular (mesmo app fechado)   │
│ com badge         │    │                               │
│                   │    │ "🔬 Você foi designado para   │
│ Drawer de         │    │  Anatomia 1 · 07:00–09:10 ·  │
│ notificações      │    │  Amanhã"                      │
│ abre com o item   │    │                               │
│ em destaque       │    │ [Ver Aula] [Snooze 30min]     │
└──────────────────┘    └──────────────────────────────┘
```

---

## 8. Schema SQL Adicional Necessário

Além das tabelas já propostas em `analise-notificacoes-cronolab.md`, as seguintes são necessárias para suportar grupos melhorados e o app mobile:

```sql
-- ── Grupos (substitui coleção Firestore 'grupos') ────────────────────────────
CREATE TABLE grupos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  cor             TEXT NOT NULL DEFAULT '#1E7EC8',
  labs_associados TEXT[] NOT NULL DEFAULT '{}',
  criado_por_uid  TEXT NOT NULL REFERENCES users(uid),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grupo_membros (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grupo_id      UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  user_uid      TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  adicionado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grupo_id, user_uid)
);

-- ── Tokens mobile para push nativo ───────────────────────────────────────────
CREATE TABLE push_tokens_mobile (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid      TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  expo_token    TEXT NOT NULL UNIQUE,
  platform      TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Adicionar coluna via_grupo_id em aulas ────────────────────────────────────
ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS via_grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;

-- ── View útil: grupos com contagem de membros ────────────────────────────────
CREATE OR REPLACE VIEW grupos_com_contagem AS
  SELECT
    g.*,
    COUNT(gm.user_uid)::INTEGER AS membros_count,
    ARRAY_AGG(u.name ORDER BY u.name) AS membros_nomes
  FROM grupos g
  LEFT JOIN grupo_membros gm ON gm.grupo_id = g.id
  LEFT JOIN users u ON u.uid = gm.user_uid
  GROUP BY g.id;

-- ── Índices de performance ───────────────────────────────────────────────────
CREATE INDEX idx_grupo_membros_grupo ON grupo_membros(grupo_id);
CREATE INDEX idx_grupo_membros_user  ON grupo_membros(user_uid);
CREATE INDEX idx_push_tokens_user    ON push_tokens_mobile(user_uid) WHERE ativo = TRUE;
CREATE INDEX idx_aulas_tecnicos      ON aulas USING GIN (tecnicos); -- busca rápida por técnico
```

---

## 9. Roadmap de Implementação

### Fase 1 — Notificações funcionando (2–3 semanas) 🔴

Prioridade máxima: fazer o ciclo básico de designação + notificação funcionar antes de qualquer app mobile.

| Item | Esforço | Impacto |
|---|---|---|
| Corrigir `NotificadorTelegram.ts` para buscar `telegram_chat_id` do usuário | Baixo | Alto |
| Criar tabela `notificacoes` + `useNotificacoes.ts` com Realtime | Médio | Alto |
| Adicionar sino 🔔 no `AppBar` com `Drawer` de notificações | Médio | Alto |
| Chamar `notificarTecnicosDesignados()` no `handleConfirmarDesignacao` | Baixo | Alto |
| Criar `notificacao_preferencias` + tela em `ConfiguracoesPerfil.jsx` | Médio | Médio |

### Fase 2 — Grupos melhorados (1–2 semanas) 🟡

| Item | Esforço | Impacto |
|---|---|---|
| Migrar grupos de array embedado para tabela `grupo_membros` | Médio | Alto |
| Adicionar `labs_associados` e `cor` aos grupos | Baixo | Médio |
| Adicionar `notificarGrupo()` ao serviço de notificações | Médio | Alto |
| Criar componente `NotificarGrupo.jsx` no painel do coordenador | Médio | Alto |
| Melhorar `MinhasDesignacoes.jsx` com Realtime | Baixo | Médio |

### Fase 3 — App Mobile com Capacitor (4–6 semanas) 🟢

O Capacitor é o caminho mais rápido para ter o app nas lojas reutilizando o frontend atual:

| Item | Esforço |
|---|---|
| Instalar Capacitor + configurar `@capacitor/push-notifications` | Baixo |
| Criar tabela `push_tokens_mobile` + endpoint de registro | Médio |
| Adaptar Edge Function para enviar via Expo (ou FCM direto via Capacitor) | Médio |
| Build Android (`.apk`) via `npx cap build android` | Baixo |
| Publicar na Google Play (beta interno) | Médio |
| Corrigir menus mobile (Drawer + BottomNavigation) | Médio |
| Build iOS via Xcode Cloud ou EAS Build | Alto |

### Fase 4 — App Expo nativo (2–3 meses) 🟢

Apenas se a Fase 3 mostrar limitações de experiência que o Capacitor não consegue resolver.

| Item | Esforço |
|---|---|
| Criar monorepo com `packages/core` | Médio |
| Migrar lógica (hooks, services, types) para `packages/core` | Médio |
| Criar `apps/mobile` com Expo Router | Alto |
| Telas: Login, Calendário, Minhas Designações, Notificações, Perfil | Alto |
| Telas exclusivas mobile: Scanner QR de lab, confirmação por biometria | Alto |
| Publicar nas lojas (Google Play + App Store) | Médio |

---

## 10. Comparativo de Abordagens Mobile

| Critério | PWA atual | Capacitor (web → app) | Expo React Native |
|---|---|---|---|
| **Tempo até app nas lojas** | ❌ Não vai para lojas | ~4 semanas | ~2–3 meses |
| **Push iOS (app fechado)** | ⚠️ Só iOS 16.4+ com PWA instalado | ✅ APNs nativo | ✅ APNs nativo |
| **Push Android (app fechado)** | ✅ | ✅ FCM nativo | ✅ FCM nativo |
| **Reuso de código UI** | ✅ Total | ✅ Total | ❌ Reescrever UI |
| **Experiência nativa** | ⚠️ Limitada | ⚠️ WebView | ✅ Componentes nativos |
| **Performance** | ⚠️ Web | ⚠️ Web em WebView | ✅ Bridge nativo |
| **Offline robusto** | ⚠️ Service Worker | ⚠️ Service Worker | ✅ SQLite local |
| **Custo de manutenção** | Baixo | Baixo | Alto (duas bases UI) |
| **Credibilidade institucional** | ⚠️ Sem ícone na loja | ✅ Nas lojas | ✅ Nas lojas |

**Recomendação prática:**  
Começar com **Capacitor** para ir às lojas rápido e ter push nativo real. Se depois de 3–6 meses em produção a experiência mobile ainda parecer "site embrulhado", migrar gradualmente para Expo mantendo o `packages/core` compartilhado.

---

## 11. Resumo Executivo

O CronoLab tem uma base sólida. Os três eixos deste documento são complementares e devem ser implementados nesta ordem de prioridade:

### 🔴 Prioridade 1 — Notificações funcionando (não depende de app)

O problema mais urgente não é o app mobile — é que **a designação de técnicos não notifica ninguém hoje**. O técnico só descobre que foi designado se entrar no sistema. Isso pode ser resolvido em 2–3 semanas sem tocar em nada de mobile:

1. Criar tabela `notificacoes` + hook `useNotificacoes` com Realtime
2. Adicionar sino no `AppBar` com drawer de notificações
3. Chamar `notificarTecnicosDesignados()` ao confirmar designação em `DesignarTecnicosModal`
4. Configurar Database Webhook → Edge Function → Web Push (já tem SW puro ✅)

### 🟡 Prioridade 2 — Grupos com área/laboratório e notificação em massa

Com notificações funcionando, adicionar metadados aos grupos (lab associado, cor) e o botão "Notificar Grupo" para o coordenador comunicar diretamente todos os técnicos de uma área.

### 🟢 Prioridade 3 — App Mobile com Capacitor

Com o sistema de notificações funcionando na web/PWA, empacotar com Capacitor para ter push nativo iOS/Android e presença nas lojas. O código React atual é reutilizado quase integralmente — só a estrutura de navegação precisa de ajuste (BottomNavigation já é a correção indicada na análise mobile existente).

---

> **Repositório de referência:** `luizedu0494-cronogramabd`  
> **Stack atual:** React 19 · Vite 7 · MUI v7 · Supabase (PostgreSQL + Auth + Realtime) · Vercel Serverless  
> **Stack proposta para mobile:** Capacitor 6 (curto prazo) → Expo SDK 51 + Expo Router (longo prazo)  
> **Documento elaborado a partir da análise direta do código-fonte**, incluindo `DesignarTecnicosModal.jsx`, `GerenciarGrupos.jsx`, `MinhasDesignacoes.jsx`, `NotificadorTelegram.ts`, `public/sw.js`, `manifest.json`, `analise-notificacoes-cronolab.md` e demais arquivos da estrutura.
