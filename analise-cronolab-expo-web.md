# CronoLab — Análise Completa: Alinhamento Expo ↔ Web e Eliminação do Telegram

> Análise técnica baseada no código-fonte real do repositório. Foca em dois objetivos principais:
> 1. Deixar o app Expo (mobile nativo) **funcionalmente idêntico** ao app web (browser)
> 2. **Eliminar a dependência do Telegram** substituindo por notificações nativas próprias

---

## 1. Diagnóstico: O Que a IA Anterior Fez (e o que Deixou de Fazer)

A IA anterior criou uma estrutura `mobile/` com Expo, mas entregou apenas um esqueleto básico:

| O que foi feito | O que ficou de fora |
|---|---|
| ✅ Estrutura de pastas Expo | ❌ A maioria das telas do web não foi portada |
| ✅ `AuthContext.js` básico | ❌ Login com Google OAuth (só e-mail/senha) |
| ✅ 6 screens básicas | ❌ Importação de cronogramas (Excel, CSV, DOCX, JSON) |
| ✅ Conexão Supabase | ❌ Assistente de IA (Groq/LangChain) |
| ✅ Token push Expo básico | ❌ Centro de notificações in-app |
| ✅ `NotificacoesScreen.js` esqueleto | ❌ Realtime via Supabase (postgres_changes) |
| ✅ `CalendarioScreen.js` simples | ❌ Grade de disponibilidade, filtros, exportação |
| ✅ `DashboardScreen.js` básico | ❌ KPIs, gráficos, análise estatística |
| ✅ `DesignacoesScreen.js` | ❌ Proposta de aula, modal de designação de técnicos |
| ✅ `PerfilScreen.js` | ❌ Upload de foto, gestão de dispositivos push |

**Resumo:** a IA fez o suficiente para o app "abrir" mas não para ele ser **útil**, que é o objetivo real.

---

## 2. Gap Analysis: Web vs. Expo (Tela por Tela)

### 2.1 Telas existentes no Web que precisam de versão Expo

| Tela / Funcionalidade Web | Arquivo Web | Status no Expo | Prioridade |
|---|---|---|---|
| Login (e-mail + Google OAuth) | `AuthContext.jsx` | ⚠️ Só e-mail | 🔴 Alta |
| Dashboard com KPIs | `src/App.jsx` (tabs) | ⚠️ Versão básica | 🔴 Alta |
| Calendário com filtros | `ListagemCompletaAulas.jsx` | ⚠️ Versão simplificada | 🔴 Alta |
| Grade de disponibilidade | `GradeDisponibilidade.jsx` | ❌ Ausente | 🔴 Alta |
| Designações (lista + propor) | `MinhasDesignacoes.jsx` | ⚠️ Só lista | 🔴 Alta |
| Centro de notificações (drawer) | `CentroNotificacoesDrawer.tsx` | ❌ Ausente | 🔴 Alta |
| Painel de avisos | `PainelAvisos.jsx` | ❌ Ausente | 🔴 Alta |
| Propor evento / aula | `ProporEventoForm.jsx` | ❌ Ausente | 🔴 Alta |
| Consultar disponibilidade | `ConsultaDisponibilidade.jsx` | ❌ Ausente | 🟡 Média |
| Assistente de IA | `AssistenteIA.jsx` | ❌ Ausente | 🟡 Média |
| Gerenciar aprovações | `GerenciarAprovacoes.jsx` | ❌ Ausente | 🟡 Média |
| Gerenciar usuários | `GerenciarUsuarios.jsx` | ❌ Ausente | 🟡 Média |
| Gerenciar períodos | `GerenciarPeriodos.jsx` | ❌ Ausente | 🟡 Média |
| Gerenciar avisos | `GerenciarAvisos.jsx` | ❌ Ausente | 🟡 Média |
| Importar cronograma (Excel/CSV/DOCX) | `ImportarCronograma.jsx` | ❌ Ausente | 🟠 Baixa |
| Download de cronograma | `DownloadCronograma.jsx` | ❌ Ausente | 🟠 Baixa |
| Análise estatística | `AnaliseEstatisticas.jsx` | ❌ Ausente | 🟠 Baixa |
| Histórico de aulas | `HistoricoAulas.jsx` | ❌ Ausente | 🟠 Baixa |

---

## 3. Estratégia Recomendada: Monorepo com Código Compartilhado

A forma mais eficiente de manter web e mobile **iguais** sem duplicar código é um **monorepo** com um pacote `core` compartilhado:

```
cronolab/
├── packages/
│   └── core/                    ← código que roda igual no web e no mobile
│       └── src/
│           ├── supabaseConfig.ts
│           ├── types/index.ts
│           ├── services/
│           │   ├── aulaService.ts
│           │   ├── userService.ts
│           │   ├── grupoService.ts
│           │   ├── notificationService.ts
│           │   └── pushService.ts        ← abstração para web e mobile
│           ├── hooks/
│           │   ├── useAulas.ts
│           │   ├── useNotificacoes.ts
│           │   ├── useDisponibilidade.ts
│           │   └── useDesignacoes.ts
│           └── utils/
│               ├── dateHelper.ts
│               └── conflitoUtils.ts
│
├── apps/
│   ├── web/                     ← React + Vite + MUI (código atual em src/)
│   └── mobile/                  ← Expo (código atual em mobile/)
```

### O que é compartilhado 100% (zero mudança)

```
supabaseConfig.ts     — cliente Supabase funciona igual em RN
types/index.ts        — interfaces Aula, Tecnico, Notificacao, Grupo
aulaService.ts        — CRUD de aulas
userService.ts        — buscar/atualizar usuários
grupoService.ts       — CRUD de grupos
notificationService.ts — despachar notificações
useAulas.ts           — realtime de aulas
useNotificacoes.ts    — centro de notificações
dateHelper.ts         — formatação de datas
conflitoUtils.ts      — verificação de conflitos
```

### O que é específico por plataforma (versões separadas necessárias)

| Camada | Web | Mobile (Expo) |
|---|---|---|
| Componentes UI | MUI (`Button`, `Dialog`, `Table`) | React Native (`TouchableOpacity`, `Modal`, `FlatList`) |
| Navegação | React Router v6 | Expo Router (file-based) |
| Notificações Push | Web Push API + VAPID | `expo-notifications` |
| Armazenamento local | `localStorage` | `expo-secure-store` |
| Tema/Estilo | `theme.js` MUI | `StyleSheet` RN |
| Google OAuth | Supabase Auth (`signInWithOAuth`) | `expo-auth-session` |
| Importação de arquivos | `<input type="file">` | `expo-document-picker` |
| Exportação (PDF/XLSX) | `jsPDF`, `ExcelJS` | `expo-print`, `expo-sharing` |

---

## 4. Implementação do App Expo — O Que Precisa Ser Feito

### 4.1 Estrutura de navegação correta (Expo Router)

```
mobile/app/
├── (auth)/
│   ├── login.tsx
│   └── _layout.tsx
├── (tabs)/
│   ├── _layout.tsx          ← BottomTabNavigator com 5 abas
│   ├── index.tsx            ← Dashboard
│   ├── calendario.tsx       ← Grade semanal/mensal
│   ├── designacoes.tsx      ← Designações + propor
│   ├── notificacoes.tsx     ← Centro de notificações
│   └── perfil.tsx           ← Perfil + configurações
├── gerenciar/
│   ├── aprovacoes.tsx
│   ├── usuarios.tsx
│   ├── avisos.tsx
│   └── periodos.tsx
├── avisos/
│   └── index.tsx
└── _layout.tsx
```

### 4.2 Bottom Navigation (substituindo o menu dropdown do web)

No web, a navegação é um `AppBar` com menu hambúrguer — inadequado para mobile. No Expo, deve ser um **`BottomTabNavigator`** com abas por perfil:

```tsx
// mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { LayoutDashboard, Calendar, ClipboardList, Bell, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1E7EC8',      // azul do tema CronoLab
        tabBarInactiveTintColor: '#8A9BB5',
        tabBarStyle: { backgroundColor: '#0B1120', borderTopColor: '#1E2A3A' },
        headerStyle: { backgroundColor: '#0B1120' },
        headerTintColor: '#E8EEF7',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Painel', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} /> }} />
      <Tabs.Screen name="calendario" options={{ title: 'Calendário', tabBarIcon: ({ color }) => <Calendar color={color} size={22} /> }} />
      <Tabs.Screen name="designacoes" options={{ title: 'Designações', tabBarIcon: ({ color }) => <ClipboardList color={color} size={22} /> }} />
      <Tabs.Screen name="notificacoes" options={{ title: 'Alertas', tabBarIcon: ({ color, focused }) => (
        <NotificationIcon color={color} size={22} badgeCount={naoLidas} />
      )}} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
    </Tabs>
  );
}
```

### 4.3 Autenticação com Google OAuth no Expo

O `AuthContext.js` atual só faz e-mail/senha. Para paridade com o web (que tem Google OAuth):

```tsx
// mobile/AuthContext.tsx
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'SEU_ANDROID_CLIENT_ID',
    iosClientId: 'SEU_IOS_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      });
    }
  }, [response]);

  return { promptAsync, request };
}
```

### 4.4 Calendário com Realtime (paridade com web)

O `CalendarioScreen.js` atual é uma lista simples. A versão correta deve reutilizar o hook compartilhado:

```tsx
// mobile/app/(tabs)/calendario.tsx
import { useAulas } from '@cronolab/core/hooks/useAulas';
import { FlatList, View, Text, StyleSheet } from 'react-native';

export default function CalendarioScreen() {
  const { aulas, loading } = useAulas(); // mesmo hook que o web usa — realtime incluso

  if (loading) return <LoadingSpinner />;

  return (
    <FlatList
      data={aulas}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <AulaCardMobile aula={item} />}
      ListEmptyComponent={<EmptyState mensagem="Nenhuma aula cadastrada." />}
    />
  );
}
```

### 4.5 Modais fullscreen (em vez de Dialog desktop)

Formulários como "Propor Aula" devem usar `Modal` do React Native, ocupando a tela toda — equivalente ao `Dialog fullScreen` sugerido para o web:

```tsx
// Padrão correto para formulários no mobile Expo
<Modal
  visible={modalAberto}
  animationType="slide"
  presentationStyle="pageSheet"   // iOS: sobe da base
  onRequestClose={() => setModalAberto(false)}
>
  <SafeAreaView style={styles.modal}>
    <ProporAulaForm onSubmit={handleSubmit} onClose={() => setModalAberto(false)} />
  </SafeAreaView>
</Modal>
```

---

## 5. Sistema de Notificações Próprio (Eliminando o Telegram)

Esta é a mudança mais importante. O Telegram é um intermediário desnecessário que impõe limitações reais:

| Problema com Telegram | Solução Proposta |
|---|---|
| Usuário precisa de conta no Telegram | Notificações nativas no próprio app |
| Notificação sem contexto de navegação | Toque na notificação abre a tela certa do app |
| Sem badge de app | Badge nativo no ícone do app no celular |
| Sem histórico in-app | Centro de notificações persistente no Supabase |
| Vinculação manual (`/start` no bot) | Registro automático no login |
| iOS não funciona sem aprovação do bot | Push nativo funciona nativamente |

### 5.1 Arquitetura dos três canais em paralelo

```
Evento no Supabase (INSERT/UPDATE em aulas, eventos, avisos)
                │
                ▼
    Database Webhook → Edge Function despachar-notificacao
                │
        ┌───────┼────────────────┐
        ▼       ▼                ▼
   In-App    Web Push         Push Nativo
  (tabela    (VAPID via        (Expo Push
  notifi-     Vercel)           via Expo
  cacoes)    para PWA/browser   para iOS/Android)
```

**Regra de ouro:** a tabela `notificacoes` é **sempre** populada. O push web e o push nativo são disparados como consequência via Database Webhook — nunca diretamente dentro de `handleSubmit()` nos componentes.

### 5.2 Tabelas necessárias no Supabase

```sql
-- 1. Notificações in-app (histório persistente)
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

CREATE INDEX idx_notificacoes_nao_lidas
  ON notificacoes(destinatario_uid, lida, criada_em DESC) WHERE lida = FALSE;

-- 2. Tokens Web Push (VAPID) — para navegador/PWA
CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid     TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tokens Expo Push — para iOS/Android nativos
CREATE TABLE push_tokens_mobile (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_uid     TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  expo_token   TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name  TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.3 Configuração de push no `app.json` do Expo

```json
{
  "expo": {
    "name": "CronoLab",
    "slug": "cronolab",
    "version": "1.0.0",
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#1E7EC8",
        "sounds": ["./assets/notification.wav"]
      }]
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

### 5.4 Serviço de push nativo no Expo

```typescript
// mobile/services/pushService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Exibir notificação mesmo com app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registrarTokenPushNativo(userUid: string): Promise<string | null> {
  if (!Device.isDevice) return null; // simulador não suporta push real

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Canais Android (obrigatório no Android 8+)
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
    await Notifications.setNotificationChannelAsync('cronolab-aulas', {
      name: 'Aulas',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  await supabase.from('push_tokens_mobile').upsert({
    user_uid: userUid,
    expo_token: tokenData.data,
    platform: Platform.OS,
    device_name: Device.deviceName,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'expo_token' });

  return tokenData.data;
}

// Listener de toque na notificação — navega para a tela correta
export function configurarListenerNotificacao(router: any) {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;

    switch (data.tipo) {
      case 'aula_adicionada':
      case 'aula_editada':
      case 'aula_excluida':
        router.push(`/calendario?aulaId=${data.aulaId}`);
        break;
      case 'aprovacao_proposta':
        router.push(`/gerenciar/aprovacoes?proposta=${data.aulaId}`);
        break;
      case 'aviso_urgente':
      case 'aviso_normal':
        router.push(`/avisos?avisoId=${data.avisoId}`);
        break;
      default:
        router.push('/');
    }
  });

  return () => subscription.remove();
}
```

### 5.5 Centro de notificações no Expo (tela completa)

```tsx
// mobile/app/(tabs)/notificacoes.tsx
import { useNotificacoes } from '@cronolab/core/hooks/useNotificacoes'; // hook compartilhado
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '../AuthContext';

export default function NotificacoesScreen() {
  const { user } = useAuth();
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas, loading } = useNotificacoes(user?.id);

  const renderItem = ({ item }: { item: Notificacao }) => (
    <TouchableOpacity
      style={[styles.item, !item.lida && styles.itemNaoLido]}
      onPress={() => marcarLida(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.titulo, !item.lida && styles.tituloNaoLido]}>{item.titulo}</Text>
        {!item.lida && <View style={styles.dot} />}
      </View>
      <Text style={styles.corpo}>{item.corpo}</Text>
      <Text style={styles.tempo}>{formatarTempo(item.criada_em)}</Text>
    </TouchableOpacity>
  );

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
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} tintColor="#1E7EC8" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma notificação ainda.</Text>
          </View>
        }
      />
    </View>
  );
}
```

### 5.6 Edge Function unificada de despacho (Supabase)

Substitui os arquivos `api/send-notification.js`, `api/send-push-notification.js` e o `NotificadorTelegram.ts` por uma única função:

```typescript
// supabase/functions/despachar-notificacao/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

serve(async (req) => {
  const { record: notificacao } = await req.json(); // Database Webhook payload
  const uid = notificacao.destinatario_uid;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const [{ data: webSubs }, { data: mobileTokens }] = await Promise.all([
    supabase.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_uid', uid).eq('ativo', true),
    supabase.from('push_tokens_mobile').select('expo_token').eq('user_uid', uid).eq('ativo', true),
  ]);

  const payload = {
    title: notificacao.titulo,
    body: notificacao.corpo,
    data: { tipo: notificacao.tipo, aulaId: notificacao.aula_id, avisoId: notificacao.aviso_id },
  };

  // 1. Web Push VAPID (navegador / PWA)
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  if (webSubs?.length) {
    await Promise.allSettled(
      webSubs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      )
    );
  }

  // 2. Expo Push (iOS / Android)
  if (mobileTokens?.length) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify(
        mobileTokens.map(t => ({
          to: t.expo_token,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: 'default',
          badge: 1,
          channelId: mapearCanal(notificacao.tipo),
        }))
      ),
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

function mapearCanal(tipo: string): string {
  if (tipo.includes('designa') || tipo === 'aprovacao_proposta') return 'cronolab-designacoes';
  if (tipo.includes('aviso')) return 'cronolab-avisos';
  return 'cronolab-aulas';
}
```

---

## 6. Correções de UI/UX: Problemas Existentes no Expo Atual

### 6.1 `AuthContext.js` — Problemas

```js
// ❌ Atual: não trata o estado "pendente" (awaiting approval)
const signIn = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};
```

```tsx
// ✅ Correto: verificar status do usuário após login
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Verificar status de aprovação
  const { data: userData } = await supabase
    .from('users')
    .select('status, cargo')
    .eq('uid', data.user.id)
    .single();

  if (userData?.status === 'pendente') {
    await supabase.auth.signOut();
    throw new Error('Sua conta ainda aguarda aprovação da coordenação.');
  }
};
```

### 6.2 `DashboardScreen.js` — Dados reais

O dashboard atual mostra valores fixos/mockados. A versão correta deve buscar KPIs reais do Supabase, exatamente como o web faz, reutilizando os mesmos serviços compartilhados.

### 6.3 `NotificacoesScreen.js` — Sem Realtime

A tela atual só faz uma busca estática. Precisa do Supabase Realtime para atualizar automaticamente — o hook `useNotificacoes` compartilhado já resolve isso.

---

## 7. Dependências a Instalar no Projeto Expo

```bash
cd mobile

# Navegação
npx expo install expo-router

# Notificações push nativas
npx expo install expo-notifications expo-device

# Auth com Google
npx expo install expo-auth-session expo-web-browser expo-crypto

# Armazenamento seguro (sessão)
npx expo install expo-secure-store

# Seleção de arquivos (importar cronograma)
npx expo install expo-document-picker

# Compartilhamento / exportação
npx expo install expo-print expo-sharing expo-file-system

# Ícones (mesmos do web — versão RN)
npm install lucide-react-native

# Supabase (já instalado, confirmar versão)
npm install @supabase/supabase-js
```

---

## 8. Variáveis de Ambiente Necessárias no Expo

```env
# .env no projeto mobile/
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_PROJECT_ID=seu-expo-project-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com

# No .env do projeto raiz (Vercel / Supabase)
VAPID_PUBLIC_KEY=BEl62...
VAPID_PRIVATE_KEY=uf_yy...
VAPID_SUBJECT=mailto:admin@cronolab.app
VITE_VAPID_PUBLIC_KEY=BEl62...   # exposta ao frontend web
```

---

## 9. Plano de Execução por Fase

### Fase 1 — Fundação (1–2 semanas)

- [ ] Reorganizar em monorepo com `packages/core`
- [ ] Mover serviços e hooks compartilhados para `core`
- [ ] Corrigir `AuthContext.tsx` (status de aprovação + Google OAuth)
- [ ] Implementar Expo Router com bottom tabs
- [ ] Criar as 3 tabelas SQL de notificações no Supabase

### Fase 2 — Telas Prioritárias (2–3 semanas)

- [ ] Dashboard com KPIs reais
- [ ] Calendário com realtime e filtros
- [ ] Designações + modal "Propor Aula"
- [ ] Centro de notificações in-app com realtime
- [ ] Painel de avisos
- [ ] Tela de perfil com gestão de dispositivos push

### Fase 3 — Notificações Nativas (1–2 semanas)

- [ ] Configurar push nativo (`expo-notifications`)
- [ ] Edge Function `despachar-notificacao` no Supabase
- [ ] Database Webhook acionando a Edge Function
- [ ] Listener de toque → navegação para tela correta
- [ ] Remover toda dependência do `NotificadorTelegram.ts`

### Fase 4 — Paridade Total (2–3 semanas)

- [ ] Telas de Gerenciar (Aprovações, Usuários, Avisos, Períodos)
- [ ] Consulta de disponibilidade
- [ ] Assistente de IA
- [ ] Importação de cronograma (via `expo-document-picker`)
- [ ] Exportação PDF/XLSX via `expo-print` + `expo-sharing`
- [ ] Análise estatística

### Fase 5 — Deploy nas Lojas

- [ ] Configurar EAS Build: `npx eas build --platform all`
- [ ] Submeter na Google Play Store
- [ ] Submeter na Apple App Store
- [ ] Configurar EAS Update para atualizações OTA

---

## 10. Resumo dos Problemas do Telegram vs. Notificações Nativas

| Critério | Telegram (atual) | Notificações Nativas (proposto) |
|---|---|---|
| Requer conta externa | ✅ Sim | ❌ Não |
| Funciona iOS sem aprovação | ❌ Não | ✅ Sim |
| Badge no ícone do app | ❌ Não | ✅ Sim |
| Toque abre tela específica | ❌ Não | ✅ Sim |
| Histórico in-app | ❌ Não | ✅ Sim |
| Marcar como lida no app | ❌ Não | ✅ Sim |
| Filtrar por tipo de alerta | ❌ Não | ✅ Sim |
| Silenciar canais específicos | ❌ Não | ✅ Sim (Android channels) |
| Push sem abrir o celular | ✅ Sim | ✅ Sim |
| Custo de infra adicional | Gratuito | Gratuito (Expo Push é gratuito) |

---

## 11. Arquivos a Remover Após a Migração

Após implementar o sistema de notificações próprio, estes arquivos deixam de ser necessários:

```
api/telegram-webhook.js          ← substituído pela Edge Function
src/services/NotificadorTelegram.ts   ← substituído por notificationService.ts
docs/GUIA_NOTIFICACOES_TELEGRAM.md   ← documentação obsoleta
api/send-notification.js         ← unificado na Edge Function
api/send-push-notification.js    ← unificado na Edge Function
```

O `firebaseConfig.js` e toda referência ao Firebase Cloud Messaging também podem ser removidos — o push web passa a usar VAPID puro, e o push mobile usa Expo.

---

## Conclusão

O projeto CronoLab tem uma base sólida (Supabase, React, Expo), mas o app mobile está entre 20–30% do que deveria ser. A IA anterior fez o esqueleto mas não conectou os dados reais, não implementou o realtime, não portou as telas funcionais e não eliminou o Telegram.

O caminho correto é o **monorepo com pacote `core` compartilhado**: evita duplicar lógica de negócio, garante que web e mobile sempre exibam os mesmos dados e comportamentos, e permite que futuras mudanças (novos campos, novas regras) sejam feitas uma única vez e reflitam automaticamente nas duas plataformas.

A eliminação do Telegram é tecnicamente simples (Edge Function + `expo-notifications`) e entrega uma experiência muito superior ao usuário — notificações que abrem a tela certa, badge no ícone, histórico persistente, tudo dentro do próprio CronoLab.
