# CronoLab — Plano de Implementação: App Único (Web + Mobile) com Expo

> Baseado na leitura do código-fonte real do repositório (`src/`, `mobile/`, `api/`, `supabase/`, docs de análise já existentes). Revisão: arquitetura consolidada em **um único código-fonte** rodando no navegador e nos apps nativos, via Expo + `react-native-web`, para eliminar de vez a divergência entre "o site" e "o app".

---

## 1. Diagnóstico: por que a tentativa anterior não funcionou

Hoje o repositório tem **dois projetos que não se falam**:

| Camada | Web (`src/`) | Mobile (`mobile/`) | Problema |
|---|---|---|---|
| Framework | React + Vite + MUI | Expo (React Navigation, telas próprias) | Duas árvores de UI completamente separadas |
| Dados | `supabaseConfig.js` + services próprios | `supabase.ts` com **chave anon hardcoded** no arquivo | Cada plataforma reimplementa a conexão do zero |
| Hooks | `useAulas.ts`, `useNotificacoes.ts` (com realtime) | `useNotificacoes.js` próprio, mais simples, sem realtime completo | Hooks duplicados que já divergem em comportamento |
| Autenticação | E-mail/senha + Google OAuth | Só e-mail/senha, sessão em `AsyncStorage` (não criptografado) | Sem paridade de login |
| Telas | ~20 páginas (Dashboard, Calendário, Grade de disponibilidade, Designações, Aprovações, Gerenciar usuários/avisos/períodos, Assistente de IA, Importar/Exportar, Análise estatística) | 6 telas básicas | Cobertura de ~20-30% do site |
| Notificações | Web Push (VAPID) + Telegram (legado) | `expo-notifications` parcial | Três sistemas sem despachante único |

A causa raiz não é só "dados divergentes" — é que **não existe um único lugar onde tela + dado + comportamento vivem juntos**. Cada vez que a IA anterior "implementou o mobile", ela recriou telas do zero em vez de reaproveitar o que já existe. Isso é estrutural: React (DOM/MUI) e React Native são runtimes diferentes, então sem uma camada de convergência, **web e mobile sempre vão divergir**, não importa quantas vezes o mobile for "corrigido" para bater com o site.

---

## 2. Arquitetura principal: convergência total com Expo + `react-native-web`

Em vez de manter dois códigos de UI sincronizados manualmente (o que já provou não funcionar), a proposta central deste plano é **substituir o app Vite/MUI atual por um único projeto Expo** que compila para três destinos a partir do mesmo código de telas:

- **Web** → `expo export -p web` (usa `react-native-web` por baixo, publicado onde o site já está hoje — Vercel/Firebase Hosting)
- **iOS/Android** → build nativo via EAS Build, a partir das mesmas telas
- **Roteamento** → Expo Router, que já resolve navegação por URL no navegador e navegação nativa no app com o **mesmo arquivo de rota**

```
cronolab/
├── app/                          ← Expo Router — ÚNICO conjunto de rotas para web e mobile
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (app)/
│   │   ├── _layout.tsx           ← navegação adaptativa (ver seção 3)
│   │   ├── index.tsx             ← Dashboard
│   │   ├── calendario.tsx
│   │   ├── designacoes.tsx
│   │   ├── notificacoes.tsx
│   │   ├── perfil.tsx
│   │   └── gerenciar/
│   │       ├── aprovacoes.tsx
│   │       ├── usuarios.tsx
│   │       ├── avisos.tsx
│   │       └── periodos.tsx
│   └── _layout.tsx
├── src/
│   ├── supabaseConfig.ts         ← cliente único, storage por plataforma (ver seção 4)
│   ├── types/
│   ├── services/                 ← aulaService, userService, grupoService, notificationService...
│   ├── hooks/                    ← useAulas, useNotificacoes, useDisponibilidade (realtime)
│   ├── components/                ← componentes universais (RN puro, funcionam em web e mobile)
│   └── theme/
│       └── tokens.ts              ← cores, espaçamento, tipografia — única fonte de verdade visual
├── app.json                       ← config Expo (web, ios, android)
└── eas.json
```

Não existe mais `apps/web` e `apps/mobile` separados: **uma tela é um arquivo, um dado é um hook, e os dois rodam nos dois lugares.** Isso é o que efetivamente resolve o pedido original — o mobile passa a usar os dados "do mesmo jeito que no navegador" porque, literalmente, é o mesmo componente renderizando nos dois ambientes.

### O que sai de cena
- `Vite` é substituído pelo bundler do Expo (Metro) para o build web.
- `MUI` é substituído por componentes RN puros + `react-native-web`, estilizados com `NativeWind` (Tailwind para RN — permite classes utilitárias iguais nas duas plataformas) ou `StyleSheet` compartilhado.
- `React Router` é substituído pelo Expo Router (file-based, funciona em ambos).

### O que continua igual
- Supabase como backend (nenhuma mudança de banco).
- Toda a lógica de negócio em `services/` e `hooks/` — só muda de pasta, não de comportamento.
- Deploy do site continua em Vercel/Firebase Hosting, só que servindo o build web do Expo em vez do build do Vite.

---

## 3. Um único componente, comportamento adaptado por plataforma

A regra de UI/UX deste plano é: **a mesma tela existe uma vez só**, e usa APIs do React Native (`Platform.OS`, `useWindowDimensions`, arquivos `.web.tsx`/`.native.tsx` quando o comportamento realmente precisa divergir) para se adaptar — nunca duas implementações mantidas à mão.

| Situação | Como resolver dentro do mesmo componente |
|---|---|
| Navegação: abas no rodapé no mobile, mas menu superior no desktop web | Um único `_layout.tsx` de navegação lendo `useWindowDimensions()`/`Platform.OS` e decidindo entre `Tabs` (mobile) e uma barra lateral/topo (web largo) — o Expo Router permite isso no mesmo arquivo de layout |
| Modal de formulário: fullscreen no mobile, dialog centralizado no desktop | Componente `AppModal` único, que aplica `presentationStyle="pageSheet"` em telas estreitas e um estilo centralizado com `maxWidth` em telas largas (`react-native-web` renderiza `Modal` como overlay no navegador) |
| Tabela densa no desktop vs cards no mobile | Um componente `ListaAulas` que decide `FlatList` em coluna única (mobile) ou grid com mais colunas (web largo), a partir do mesmo array de dados |
| Bibliotecas que só existem no navegador (`jsPDF`, `ExcelJS`, `<input type="file">`) | Arquivo separado só quando a **implementação técnica** exige (ex: `exportPdf.web.ts` usa `jsPDF`, `exportPdf.native.ts` usa `expo-print`) — a tela que chama continua sendo uma só, só a função de baixo nível é dividida por plataforma |

Isso é diferente do plano anterior (que propunha telas MUI e telas RN separadas mantidas manualmente em paralelo): aqui a divergência só existe onde é **tecnicamente inevitável** (acesso a arquivo, impressão, etc.), nunca na estrutura da tela em si.

### Design tokens únicos
`src/theme/tokens.ts` concentra cor primária (`#1E7EC8`), tema escuro, espaçamento e tipografia. Componentes usam esses tokens via `StyleSheet`/`NativeWind` — não existe mais `theme.js` do MUI e um `StyleSheet` do mobile desalinhados; existe um só arquivo de marca visual.

---

## 4. Camada de dados: um cliente Supabase para os dois ambientes

```ts
// src/supabaseConfig.ts
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// No web, react-native-web + Expo já resolvem localStorage automaticamente
// via um adapter compatível; em nativo, usamos AsyncStorage/SecureStore.
const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);
```

Com isso, `useAulas()`, `useNotificacoes()` etc. deixam de precisar de qualquer versão "mobile" e "web" — é o mesmo hook, chamado pelo mesmo componente de tela, rodando nos dois lugares. Para sessão mais sensível em nativo, trocar `AsyncStorage` por um adapter `expo-secure-store` sem alterar o restante do código.

---

## 5. Notificações: unificar em vez de manter 3 sistemas

O repositório já tem a base pronta (`supabase/functions/despachar-notificacao/index.ts`, tabelas `notificacoes`, `push_subscriptions`, `push_tokens_mobile`). Falta conectar:

1. Toda ação relevante (nova aula, aviso, aprovação) grava um registro em `notificacoes` — nunca dispara push direto do componente.
2. Um Database Webhook do Supabase aciona a Edge Function `despachar-notificacao`.
3. A Edge Function decide o canal: Web Push (VAPID) para quem está no navegador/PWA, Expo Push para quem tem o app nativo instalado — e como agora é o mesmo app rodando nos dois, o registro do token de push também pode acontecer no mesmo hook `usePushRegistration()`, com `Platform.OS` decidindo entre `Notification.requestPermission()` (web) e `expo-notifications` (nativo).
4. O Telegram (`api/telegram-webhook.js`, `NotificadorTelegram.ts`) é desligado assim que os dois canais nativos estiverem estáveis.

---

## 6. Plano de execução por fase

### Fase 0 — Prova de conceito (3–5 dias)
- [ ] Criar projeto novo Expo Router com `react-native-web` habilitado (`npx create-expo-app` + `expo export -p web` funcionando)
- [ ] Portar **uma** tela real (ex: Login) e validar que renderiza corretamente no navegador e no Expo Go, consumindo o Supabase de produção
- [ ] Validar o build web (`expo export -p web`) publicado num preview (Vercel) para confirmar viabilidade antes de migrar tudo

### Fase 1 — Fundação (1–2 semanas)
- [ ] Mover `services/`, `hooks/`, `types/`, `utils/` de `src/` para o novo projeto, sem alteração de lógica
- [ ] Configurar `supabaseConfig.ts` único com storage por plataforma (seção 4)
- [ ] Configurar Expo Router com grupos de rota `(auth)` e `(app)`
- [ ] Unificar `AuthContext` (login, cadastro, status "pendente", Google OAuth) em um único Provider

### Fase 2 — Navegação adaptativa e telas essenciais (2–3 semanas)
- [ ] Layout de navegação único com `Tabs` no mobile / barra lateral no desktop (seção 3)
- [ ] Portar, uma vez só: Dashboard (KPIs reais), Calendário com realtime e filtros, Grade de disponibilidade, Designações + "Propor aula", Centro de notificações, Painel de avisos
- [ ] Componente `AppModal` único para formulários (fullscreen mobile / dialog largo desktop)

### Fase 3 — Paridade completa de telas (2–3 semanas)
- [ ] Gerenciar (Aprovações, Usuários, Avisos, Períodos) com controle de acesso por cargo
- [ ] Consulta de disponibilidade, Assistente de IA (reaproveitando o service Groq/LangChain já existente)
- [ ] Importar cronograma (`expo-document-picker` no nativo / `<input type="file">` no web, por trás da mesma tela)
- [ ] Exportar PDF/XLSX (`expo-print`+`expo-sharing` no nativo / `jsPDF`+`ExcelJS` no web, por trás da mesma função de exportação)
- [ ] Análise estatística com gráficos (biblioteca compatível com `react-native-web`, ex: `react-native-svg` + `victory-native`, que roda igual nos dois ambientes)

### Fase 4 — Notificações nativas unificadas (1–2 semanas)
- [ ] Hook `usePushRegistration()` único, decidindo canal por `Platform.OS`
- [ ] Ativar Database Webhook → Edge Function `despachar-notificacao` (já escrita no repo)
- [ ] Listener de toque na notificação navegando para a rota certa via Expo Router (funciona igual em deep link web e nativo)
- [ ] Desligar gradualmente o fluxo do Telegram

### Fase 5 — Corte de tráfego e substituição do site atual (1 semana)
- [ ] Rodar o novo build web em ambiente de staging por tempo suficiente para validar paridade visual e funcional com o site Vite atual
- [ ] Migrar DNS/deploy de produção para o build Expo web, aposentando o projeto Vite/MUI
- [ ] Remover dependências que não são mais usadas (`@mui/*`, Vite, React Router)

### Fase 6 — Publicação nativa e qualidade (1–2 semanas)
- [ ] EAS Build para Android/iOS a partir do mesmo código já validado no web
- [ ] EAS Update para atualizações OTA sem depender da loja a cada ajuste pequeno
- [ ] Testes de paridade tela a tela entre web e nativo (deve ser trivial, já que é o mesmo componente)
- [ ] Publicação nas lojas (Google Play / App Store)

---

## 7. Riscos específicos desta arquitetura (e como mitigar)

| Risco | Mitigação |
|---|---|
| Bibliotecas do site atual sem equivalente em `react-native-web` (`jsPDF`, `ExcelJS`, drag-and-drop de upload) | Isolar em arquivos `.web.ts`/`.native.ts` (seção 3) — a exceção fica no detalhe técnico, não na tela inteira |
| Regressão visual/funcional no site em produção durante a migração | Fase 0 (prova de conceito) e Fase 5 (staging antes do corte de DNS) existem exatamente para reduzir esse risco — nunca substituir produção sem paralelo validado |
| Curva de aprendizado com Expo Router + `react-native-web` para quem só conhece MUI | Migrar telas simples primeiro (Login, Perfil) antes das telas mais complexas (Gerenciar, Assistente de IA) |
| SEO do site (se relevante para o CronoLab, que parece ser uso interno/institucional) | Expo Router suporta geração estática (`output: "static"`) para as rotas públicas, se necessário |
| Esforço inicial maior que "só consertar o mobile" | É esperado — o ganho é não ter mais esse mesmo problema se repetindo a cada nova funcionalidade daqui pra frente |

---

## 8. Resumo executivo

O problema relatado — "o Expo não usa os dados do mesmo jeito que o navegador" — não vai se resolver mantendo dois códigos de UI sincronizados manualmente; foi exatamente esse padrão que já falhou. A solução coesa é **parar de ter um projeto web e um projeto mobile**, e passar a ter **um projeto Expo único**, com Expo Router + `react-native-web`, que compila tanto para o navegador quanto para os apps nativos a partir do mesmo código de tela e do mesmo hook de dados. As divergências de UI (abas vs menu, modal fullscreen vs dialog) deixam de ser dois códigos mantidos à mão e passam a ser uma decisão de layout dentro do próprio componente, baseada em `Platform`/largura de tela.

A ordem recomendada é: **(0) prova de conceito → (1) fundação (dados + rotas) → (2) navegação adaptativa e telas essenciais → (3) paridade completa → (4) notificações unificadas → (5) corte de produção do site → (6) publicação nativa.**
