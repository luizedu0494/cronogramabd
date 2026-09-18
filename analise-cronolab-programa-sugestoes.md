
# 📋 Análise Técnica & Programa de Sugestões — CronoLab
> Olhar combinado de Designer (UI/UX, acessibilidade) e Programador (arquitetura, qualidade, segurança).
> Base: estrutura de arquivos e código-fonte fornecidos (versão Supabase, set/2026).

---

## 🔍 PARTE 1 — DIAGNÓSTICO (o que está acontecendo de verdade no código)

### 1.1 Problema crítico: migração Firebase → Supabase incompleta
O projeto é a "versão 2 (Supabase)", mas o código carrega resíduos pesados da versão Firebase. Isso é a **maior fonte de bugs e débito técnico** do repositório:

| Sintoma | Onde |
|---|---|
| `db`, `addDoc`, `collection`, `serverTimestamp`, `Timestamp` usados sem import | `AssistenteIATecnico.jsx` (`handleConfirmarProposta` quebra em runtime), `verificarConflitos` e `handleSubmit` em `ImportarAgendamento.jsx` |
| `writeBatch(db)` com `db` indefinido | `GerenciarEventosAvancado.jsx` (edição em lote e exclusão em lote estão quebradas) |
| `currentUser` indefinido | `EventosManutencao.jsx` (`criado_por_uid` salva sempre "desconhecido") |
| Coleção `fcmTokens` (Firestore) + VAPID Supabase ao mesmo tempo | `api/save-push-token.js` vs `scripts/schema_notificacoes.sql` |
| Dependências Firebase e Supabase ambas no `package.json` | firebase, firebase-admin **e** @supabase/supabase-js instalados |
| Chave Groq exposta no cliente (`import.meta.env.VITE_GROQ_API_KEY`) | `AssistenteIATecnico.jsx`, `ImportarAgendamento.jsx` |

**Recomendação central:** criar um *épico de migração* ("Supabase puro") antes de qualquer feature nova. Cada resíduo Firebase é um bug latente.

### 1.2 Bugs concretos encontrados (não são estilo, são defeitos)

1. **Código inalcançável** — `AssistenteIATecnico.jsx`: após `return` dentro do try há um segundo bloco `const jsonMatch = ...` que nunca executa (resto de refatoração).
2. **Estados não declarados** — `DesignarTecnicosModal.jsx`: `fetchData` usa `setLoading` e `setError`, mas os `useState` correspondentes **não existem no componente** → crash ao abrir o modal.
3. **Import dinâmico desnecessário** — `DesignarTecnicosModal.jsx` faz `await import('./supabaseConfig')` dentro do handler, sendo que `supabase` já está importado no topo do arquivo.
4. **Mutation de estado com função não-setter** — `ImportarAgendamento.jsx`, `handleChange`: `setAulas(prev => { const n = [...prev]; n[idx] = {...}; return n; })` está correto, mas `handleSubmit` usa `supabase.from('aulas')` enquanto `verificarConflitos` logo acima ainda usa `getDocs(query(collection(db...)))` — a aula é inserida **sem verificar conflito real** na versão Supabase (a checagem de conflito está morta).
5. **Paginação quebrada** — `GerenciarAulasAvancado.jsx`: a query usa `.range()` com `AULAS_POR_PAGINA`, mas filtros de `assunto`, `liga` e `cursos` são aplicados **depois**, no cliente → contagem e paginação mentem quando há filtro local.
6. **`aula_cursos`** — tabela relacionamento usada em `GerenciarAulasAvancado`, mas `aulas.cursos` é `TEXT[]` em outros arquivos → dupla fonte de verdade para cursos (schema inconsistente).
7. **Duplicação massiva de constantes** — `BLOCOS_HORARIO` definido em **8+ arquivos** (`AssistenteIATecnico`, `AulaCard`, `ConsultaDisponibilidade`, `DownloadCronograma`, `EventosManutencao`, `GerenciarEventosAvancado`, `ImportarAgendamento`...). Um dia o bloco muda e 8 telas quebram em silêncio.
8. **`tsconfig` com `strict: false` + `allowJs: true`** em um projeto misto JS/TS grande — o TypeScript não está protegendo nada; arquivos `.ts` (stores, services, schemas com Zod) coexistem com `.jsx` sem tipagem.
9. **Testes praticamente inexistentes** — vitest configurado no `vite.config.js`, mas há apenas `App.test.jsx`, um teste de rate-limit e um `testes_ia_manual.js` (manual!). Nenhum teste cobre regras de negócio (conflitos, status, permissões).
10. **`vercel.json` com rewrite total** `/(.*) → /index.html` — as serverless functions em `/api` funcionam, mas há rotas de API misturadas com rotas SPA sem tratamento de 404 real.

### 1.3 Segurança (prioridade alta)

- **RLS aberto**: o próprio `backup-supabase.md` admite políticas `FOR ALL USING (true)` em produção — qualquer usuário autenticado lê/escreve tudo (`users`, `aulas`, `avisos`). O plano de endurecimento RLS já documentado nunca foi executado.
- **Chave Groq no cliente** — qualquer pessoa abre DevTools e gasta sua cota. O proxy `/api/groq.js` **já existe**; basta remover o `VITE_` do prefixo e usar só no servidor.
- **Webhook Telegram sem autenticação** — `api/telegram-webhook.js` aceita POST de qualquer origem (CORS `*`) e dispara mensagens se as envs vazarem.
- **`.env.example` mistura segredos de servidor e cliente** — `VAPID_PRIVATE_KEY` não deveria nunca existir com prefixo `VITE_`.
- **Sem rate-limit real no proxy Groq** — existe `groqRateLimit.ts` nos utils, mas não há evidência de que seja aplicado no endpoint `/api/groq`.

### 1.4 Arquitetura e DX (developer experience)

- **Duplo state management**: `AuthContext` (Context API) + `authStore.ts`/`aulaStore.ts` (Zustand) + `@tanstack/react-query` instalado. Três abordagens de estado para o mesmo app — escolher **uma** (sugestão: React Query para servidor + Zustand só para UI global).
- **`supabaseConfig.js` e `supabaseConfig.ts`** coexistem na mesma pasta — importadores podem pegar o errado dependendo do bundler.
- **Duas árvores de componentes**: `src/componentes/comuns/` (pt) e `src/components/` (en) + componentes soltos na raiz de `src/` (`AulaCard.jsx` ao lado de `pages/`). Falta uma convenção.
- **`useEffect` com `handleSearch` dependendo de `filtros` mas chamado com `[]`** em `GerenciarAulasAvancado` — a busca inicial ignora o estado inicial dos filtros (comportamento frágil).
- **Realtime subscrito em componentes** (`EventosManutencao`) sem invalidação de cache central — cada tela recarrega tudo; com React Query isso vira `invalidateQueries` automático.
- `react-hot-toast` **e** `sonner` instalados — dois sistemas de toast.
- MUI v7 **e** Tailwind v4 configurados juntos — sem regra de quando usar qual; risco de tokens duplicados (o próprio `sugestoes-ui-cronolab.md` propõe tokens que já existem em `theme/tokens.ts` e `tailwind.config.js`).

---

## 🎨 PARTE 2 — DESIGN (olhar de designer de produto)

### 2.1 O que já é bom (reconhecer para não quebrar)
- Identidade visual consistente: azul CESMAC `#1E7EC8`, fonte Sora, tokens de cor por tipo de atividade (azul/roxo/vermelho) — linguagem clara.
- Cobertura funcional impressionante: calendário, estatísticas, disponibilidade, importação por IA, notificações multi-canal, PWA, exportações.
- O próprio arquivo `sugestoes-ui-cronolab.md` mostra maturidade de preocupação com acessibilidade.

### 2.2 Problemas de design identificados no código
1. **Truncamento como padrão** — selects com `renderValue` que cortam (`${sel[0]} +${n-1}`), chips com `maxWidth: 130px`. O usuário nunca vê o que selecionou. (O doc interno já denuncia isso — executar as correções propostas lá.)
2. **Cards de dashboard com uppercase + caption** — hierarquia tipográfica invertida (número gigante, label ilegível).
3. **Feedback vazio inconsistente** — `EmptyState` importado em algumas telas, em outras há um `EmptyState` **duplicado e diferente** inline em `GerenciarEventosAvancado.jsx` (mesmo nome, outro visual).
4. **Feedback de carregamento = tela em branco com spinner** — sem skeletons em nenhuma listagem (a lib `framer-motion` está instalada e mal usada; dá pra fazer shimmer com ela).
5. **Formulários longos sem seção nem progresso** — `ImportarAgendamento` e dialogs de evento empilham 10+ campos; sem agrupamento semântico, sem resumo do que falta (a própria barra de completude do step 1 mostra que dá pra fazer melhor).
6. **Tema claro/escuro parcial** — `darkMode: 'class'` no Tailwind existe, mas quase todos os componentes usam cores hardcoded (`#f1f8e9`, `#fff8e1` em `ConsultaDisponibilidade`) que quebram no dark.
7. **Micro-interações inexistentes** — aprovar/rejeitar proposta (ação de 1 clique central do produto) não tem animação de confirmação, undo, nem otimismo; o usuário clica e espera.

### 2.3 Oportunidades de inovação em design
- **Modo "foco do técnico"**: já há laboratórios favoritos; evoluir para um *painel-raio-x* do dia: timeline vertical por laboratório, com badges de conflito e "próxima troca de turma em X min".
- **Heatmap de ocupação** (visão coordenador): a query de estatísticas já existe; um grid lab × horário com intensidade de cor substitui gráficos de pizza (que com 31 labs viram pizza ilegível).
- **Command palette (⌘K)**: com o volume de telas que o sistema tem, busca global de "aula, laboratório, professor, página" é a inovação de UX de maior ROI.
- **Timeline de conflito visual** na Consulta de Disponibilidade: hoje é lista de chips; poderia ser um mini-gantt por dia.
- **Estados vivos**: skeletons, otimistic update com "desfazer" no snackbar (excluir aula → snackbar com "Desfazer" por 5s).
- **Onboarding do coordenador**: hoje só o técnico tem onboarding guiado (segundo o index.html do docs). Coordenador novo cai num painel com 20 menus.

---

## 🚀 PARTE 3 — PROGRAMA DE SUGESTÕES (roadmap priorizado)

### FASE 0 — Estabilização (semana 1–2) | *sem isso, o resto é areia movediça*
1. Remover todos os resíduos Firebase dos componentes Supabase (lista da seção 1.1 como checklist).
2. Corrigir os 10 bugs da seção 1.2.
3. Centralizar `BLOCOS_HORARIO`, `LISTA_CURSOS`, `LISTA_LABORATORIOS` em `src/constants/` (já existe a pasta! só fazer os arquivos usarem dela).
4. Mover `GROQ_API_KEY` para servidor (remover prefixo `VITE_`), ativar rate-limit no `/api/groq`.
5. Executar o plano de RLS do `backup-supabase.md` (função `is_coordenador()` + políticas por tabela).

### FASE 1 — Fundações (semana 3–5)
6. **Escolher stack de estado**: React Query (servidor) + Zustand (UI). Remover `AuthContext` ou reescrevê-lo sobre o `authStore`.
7. **Adotar TypeScript de verdade**: ligar `strict`, tipar `types/index.ts` (já existe!) com as entidades do schema (`Aula`, `Evento`, `Usuario`) e ir migrando os arquivos mais críticos (`services/`, `hooks/`).
8. **Padronizar serviços**: tudo que fala com Supabase passa por `services/` (metade dos componentes faz `supabase.from()` direto; a outra metade usa services — unificar).
9. **Testes de regras de negócio** (vitest já configurado): conflito de horário, chave natural de backup, transições de status (`pendente→aprovada→rejeitada`), RLS.
10. **Componente `EmptyState` único** e biblioteca de feedback (`sonner` ou `react-hot-toast` — escolher um).

### FASE 2 — Qualidade de experiência (semana 6–9)
11. Executar o checklist de acessibilidade do `sugestoes-ui-cronolab.md` (contraste, `aria-label`, truncamento).
12. **Skeletons** em todas as listagens; **otimistic updates com undo** em aprovar/excluir.
13. **Dark mode de verdade**: varrer cores hardcoded e usar os tokens de `theme/tokens.ts`.
14. **Command palette ⌘K** (biblioteca `cmdk` — leve, 3kb).
15. Reformular os selects multi com pesquisa (`Autocomplete` do MUI já resolve truncamento).

### FASE 3 — Inovação (semana 10+)
16. **Heatmap de ocupação** para coordenador (dados já existem em `AnaliseEstatisticas`).
17. **Previsão de demanda**: `brain.js` e `predictionService.js` já estão instalados/escritos e aparentemente não usados na UI — conectar: "Labs com maior chance de conflito na próxima semana".
18. **Kanban de propostas** com `@dnd-kit` (instalado!) — arrastar proposta entre Aprovado/Rejeitado/Pendente.
19. **PWA offline real**: `sw.js` hoje só trata push; adicionar cache de consulta pública do cronograma (modo visitante funciona sem rede).
20. **Importação com confirmação visual no calendário**: após importar, mostrar as aulas pousando no calendário (framer-motion).
21. **IA generativa de alocação**: dado um conjunto de aulas para alocar, a IA sugere distribuição sem conflito usando a mesma infra `/api/groq`.
22. **Métricas de produto**: logar funis (proposta→aprovação, tempo médio de aprovação) — a tabela `logs` já existe.

---

## 📊 Resumo executivo

| Dimensão | Nota | Maior alavanca |
|---|---|---|
| Arquitetura | ⚠️ 5/10 | Terminar migração Supabase; unificar estado |
| Qualidade de código | ⚠️ 4/10 | Eliminar bugs Firebase + tipar + testar regras |
| Segurança | 🔴 3/10 | RLS + chave Groq no servidor |
| Design visual | ✅ 7/10 | Executar o próprio doc de UI; dark mode; micro-interações |
| Acessibilidade | ⚠️ 5/10 | Checklist WCAG já pronto — só aplicar |
| Inovação | ✅ 8/10 de potencial | IA alocadora, heatmap, kanban, ⌘K — boa parte com libs já instaladas |

**Frase-síntese:** o CronoLab tem produto maduro e visão clara, mas o código está "no meio da ponte" entre Firebase e Supabase — a inovação mais valiosa agora é **estabilizar as fundações**; quase todas as libs das features inovadoras (dnd-kit, brain.js, framer-motion, react-query) já estão no `package.json` esperando ser conectadas.
