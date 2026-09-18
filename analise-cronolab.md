# 🔬 Análise Técnica — CronoLab CESMAC

> **Revisão especializada** · React + Supabase · Setembro 2026

---

## 1. Visão Geral do Projeto

O CronoLab é um sistema de agendamento de laboratórios para o CESMAC (Centro Universitário de Maceió), construído com **React + MUI + Supabase**, com camada de IA via **Groq (llama-3.1-8b-instant)**. O sistema cobre os fluxos de:

- Proposta e aprovação de aulas por técnicos e coordenadores
- Calendário semanal com blocos de horário fixos
- Gestão de eventos e manutenções
- Exportação de cronograma (PDF, Excel, .ics)
- Consulta de disponibilidade por período
- Importação de arquivos (DOCX, XLSX, PDF) com extração assistida por IA
- Assistente conversacional para técnicos (consulta + proposta de aulas)

O código demonstra **alto nível de maturidade** para um projeto acadêmico, com boas práticas visíveis em vários pontos.

---

## 2. Pontos Fortes

### ✅ Arquitetura e Stack

- Separação clara de responsabilidades (services, hooks, constants, components)
- Uso correto de `useCallback` e `useMemo` para evitar re-renders desnecessários
- `AuthContext` bem estruturado com suporte a sessão local como fallback
- Real-time via Supabase channels (`postgres_changes`) em `EventosManutencao`
- Paginação server-side com `range()` do Supabase em `GerenciarAulasAvancado`

### ✅ UX e Acessibilidade

- FAQ com filtro por categoria e chips de navegação
- Feedback consistente com `Snackbar` + `Alert` em todos os formulários
- Skeleton loading (`TableSkeleton`) e estados vazios (`EmptyState`) presentes
- Responsividade com `useMediaQuery` e `fullScreen` em dialogs móveis
- `Tooltip` em ações de ícone para acessibilidade

### ✅ Integrações de IA

- Importação inteligente com extração client-side e envio à IA (Groq) para interpretação
- Assistente conversacional com JSON estruturado, histórico e reconhecimento de voz
- Explicação de gráficos com IA (mesmo que ainda seja via `setTimeout` simulado)

---

## 3. Problemas Identificados e Sugestões de Melhoria

### 🔴 Crítico — Segurança

#### 3.1 Chave de API Groq exposta no frontend

```js
// AssistenteIATecnico.jsx
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
```

**Problema:** Qualquer variável `VITE_*` é embutida no bundle e visível no DevTools. A chave Groq é enviada ao cliente.

**Solução:** Mover todas as chamadas Groq para uma Edge Function ou serverless (Supabase Edge Functions / Vercel). O frontend já usa `/api/groq` como proxy em alguns lugares — esse padrão deve ser **obrigatório e exclusivo**, removendo a variável do cliente.

```js
// Correto — frontend apenas chama o proxy, sem expor a chave
const response = await fetch('/api/groq', { method: 'POST', body: JSON.stringify({ payload }) });
```

---

#### 3.2 Validação de role apenas no frontend

O controle de acesso (técnico, coordenador, visualizador) é feito via `userInfo?.role` no React. Não há evidência de **RLS (Row Level Security)** no Supabase sendo validada.

**Solução:** Habilitar RLS nas tabelas `aulas`, `users`, `eventos_manutencao` e `notificacoes`, restringindo operações por role. Usar JWT claims do Supabase para isso.

---

### 🟠 Alto — Qualidade de Código

#### 3.3 `BLOCOS_HORARIO` duplicado em múltiplos arquivos

O mesmo array de blocos de horário é declarado em `ConsultaDisponibilidade.jsx`, `DownloadCronograma.jsx` e outros componentes, ao invés de importar de `./constants/horarios`.

**Solução:** Centralizar **todos** os usos em `src/constants/horarios.js` e remover as cópias locais.

---

#### 3.4 `handleGerarExplicacaoIA` em `AnaliseEstatisticas.jsx` é falso

```js
// Simula IA com setTimeout — não faz chamada real
setTimeout(() => {
    setExplicacaoIA(`📊 Resumo da IA: Em ${selectedYear}...`);
}, 500);
```

**Problema:** O botão "Explicar Gráficos com IA" não usa IA de fato. É uma geração de template local.

**Solução:** Implementar chamada real ao Groq com os dados de `stats` como contexto, ou remover o botão até a implementação estar pronta. Manter funcionalidade falsa confunde usuários e coordenadores.

---

#### 3.5 Paginação de eventos sem controle real de página anterior

Em `GerenciarEventosAvancado.jsx`, `handleSearch` recebe `'prev'` como argumento mas a lógica de paginação não está implementada para cursor-based — a query não usa `.range()` nem `.limit()`:

```js
// Não há offset/limit na query de eventos
let queryRef = supabase.from('eventos_manutencao').select('*');
```

**Solução:** Implementar paginação com `.range(offset, offset + LIMIT - 1)` igual ao `GerenciarAulasAvancado`.

---

#### 3.6 `window.confirm` para exclusão de grupos

```js
// GerenciarGrupos.jsx
if (window.confirm("Tem certeza que deseja apagar este grupo?")) {
```

**Problema:** `window.confirm` é bloqueante, não estilizável, e inconsistente com o restante do sistema que usa `<DialogConfirmacao>`.

**Solução:** Substituir por `<DialogConfirmacao>` já existente no projeto.

---

#### 3.7 `<FormControl>` com dois atributos `sx` em `ImportarAgendamento.jsx`

```jsx
<FormControl sx={{ minWidth: 160 }} size="small" sx={{ mt: 2 }}>
```

**Problema:** Dois atributos `sx` no mesmo elemento — o segundo sobrescreve o primeiro silenciosamente.

**Solução:**
```jsx
<FormControl size="small" sx={{ minWidth: 160, mt: 2 }}>
```

---

### 🟡 Médio — Experiência do Usuário

#### 3.8 Sem feedback de conflito de horário ao propor aula

O assistente IA (`AssistenteIATecnico`) monta uma proposta, mas não verifica se o laboratório/horário sugerido já está ocupado antes de exibir o card de confirmação.

**Solução:** Antes de exibir o card de proposta, chamar a mesma lógica de `verificarConflitos` usada em `ImportarAgendamento.jsx`.

---

#### 3.9 Exportação PDF usa truncamento fixo de string

```js
doc.text(tituloStr.substring(0, 32), margin + 92, y + 5);
```

**Problema:** Textos longos são truncados sem aviso, gerando PDFs com informações cortadas.

**Solução:** Usar `doc.splitTextToSize(tituloStr, larguraColuna)` do jsPDF para quebra de linha automática, aumentando `rowHeight` dinamicamente.

---

#### 3.10 FAQ visível apenas para visitantes sem filtro de categorias privadas

O componente `AjudaFAQ` filtra perguntas de `tecnico` e `coordenador` para o perfil `visualizador`, mas as categorias ainda aparecem nos chips de filtro. O visitante vê chips de categorias que retornam "Nenhuma pergunta".

**Solução:** Filtrar `categoriasDisponiveis` nos chips da mesma forma que em `faqBase`:
```js
// Já feito para o faqBase, mas não para os chips
const categoriasDisponiveis = isVisitor ? { visitante, calendario, geral } : CATEGORIAS;
// ✅ Chips devem iterar sobre categoriasDisponiveis, não CATEGORIAS
```

---

#### 3.11 Consulta de disponibilidade: limite de 3 meses não validado

O usuário pode selecionar um período de 2 anos, gerando centenas de resultados e degradando a performance.

**Solução:** Adicionar validação máxima de período (ex: 6 meses) com feedback informativo.

---

## 4. Novidades a Implementar

### 🚀 Prioridade Alta

#### 4.1 Notificações In-App em tempo real (Bell Icon)

Atualmente, notificações são inseridas na tabela `notificacoes` mas não há interface para visualizá-las em tempo real.

**Implementar:**
- Ícone de sino no header com badge de contagem
- Drawer/Popover listando notificações com link para a aula relacionada
- Marcar como lido / limpar todas
- Canal Supabase real-time escutando `notificacoes` filtrado por `destinatario_uid`

```js
supabase.channel('notificacoes-user')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'notificacoes',
    filter: `destinatario_uid=eq.${uid}`
  }, handleNovaNotificacao)
  .subscribe();
```

---

#### 4.2 Dashboard principal com KPIs

Não existe uma tela de início com resumo do sistema. Adicionar um Dashboard com:

- Total de aulas aprovadas esta semana / mês
- Laboratórios mais utilizados (mini-gráfico)
- Próximas aulas do dia (lista rápida)
- Pendências aguardando aprovação (alerta para coordenadores)
- Técnicos disponíveis hoje

---

#### 4.3 Recorrência de aulas

Atualmente cada aula é agendada individualmente. Professores frequentemente têm aulas semanais recorrentes.

**Implementar:**
- Campo "Repetir" ao propor aula: diário, semanal, quinzenal, mensal
- Geração automática de N aulas com verificação de conflitos em lote
- Opção de "editar apenas esta" ou "editar todas" (padrão Google Calendar)

---

#### 4.4 Visão mensal no Calendário

O calendário atual exibe apenas semanas. Adicionar:

- Alternância entre `Semana`, `Mês` e `Lista`
- Navegação por mês com células de dia clicáveis
- Chips coloridos por laboratório nas células

---

### 🔵 Prioridade Média

#### 4.5 Assinatura digital de cronograma

Para fins de registro institucional, permitir que o coordenador "publique" o cronograma de um mês, gerando uma versão imutável (snapshot) com hash no banco, imprimível com QR Code de verificação.

---

#### 4.6 Perfil de Professores / Proponentes

Atualmente `proposto_por_nome` é uma string simples. Criar vínculo com a tabela `users` para:

- Ver histórico de propostas por professor
- Filtrar aulas por proponente no calendário
- Estatísticas de uso por docente

---

#### 4.7 Sugestão inteligente de horário

Ao propor uma aula, exibir automaticamente os **próximos 3 horários livres** no laboratório desejado, baseado no banco de dados, sem precisar abrir a Consulta de Disponibilidade separadamente.

---

#### 4.8 Exportação de cronograma por QR Code

Gerar um QR Code que aponta para uma URL pública somente leitura do cronograma filtrado (por laboratório ou por semana), permitindo impressão para fixar nas portas dos laboratórios.

---

#### 4.9 Tema escuro persistente

O sistema usa `prefers-color-scheme` mas não há toggle manual persistido no perfil do usuário.

**Implementar:**
- Botão de alternância claro/escuro no header
- Persistência da preferência no Supabase (`users.theme_preference`)

---

### 🟣 Prioridade Baixa / Futura

#### 4.10 App mobile (PWA ou React Native)

O sistema é responsivo mas não é um PWA. Adicionar:
- `manifest.json` + Service Worker para instalação
- Push notifications nativas via Web Push (já existe endpoint `/api/send-push-notification`)
- Ícone de "Adicionar à tela inicial"

---

#### 4.11 Integração com Google Calendar / Outlook

Além do export `.ics`, implementar sincronização bidirecional via OAuth, para que aulas aprovadas apareçam automaticamente no calendário pessoal do técnico/professor.

---

#### 4.12 Histórico de versões de uma aula

Ao editar uma aula (assunto, laboratório, horário), registrar o estado anterior em tabela de audit separada, permitindo visualizar o histórico de mudanças e reverter.

---

## 5. Resumo de Prioridades

| # | Item | Tipo | Prioridade |
|---|------|------|-----------|
| 3.1 | Chave Groq exposta no frontend | 🔴 Bug/Segurança | **Crítica** |
| 3.2 | RLS no Supabase ausente | 🔴 Segurança | **Crítica** |
| 3.3 | `BLOCOS_HORARIO` duplicado | 🟠 Manutenção | Alta |
| 3.4 | "Explicar com IA" é falso | 🟠 Integridade | Alta |
| 3.5 | Paginação de eventos quebrada | 🟠 Bug | Alta |
| 3.6 | `window.confirm` na exclusão de grupos | 🟡 UX | Média |
| 3.7 | Dois `sx` no mesmo elemento | 🟡 Bug visual | Média |
| 3.8 | Sem verificação de conflito na proposta via IA | 🟡 UX | Média |
| 4.1 | Notificações in-app em tempo real | 🚀 Feature | Alta |
| 4.2 | Dashboard com KPIs | 🚀 Feature | Alta |
| 4.3 | Recorrência de aulas | 🚀 Feature | Alta |
| 4.4 | Visão mensal no calendário | 🚀 Feature | Média |
| 4.9 | Tema escuro persistente | 🔵 Feature | Média |
| 4.10 | PWA / App mobile | 🟣 Feature | Baixa |

---

## 6. Considerações Finais

O CronoLab é um sistema bem construído e funcional, com complexidade acima da média para um projeto acadêmico. A integração com IA (Groq) é usada de forma criativa e coerente com o domínio. Os pontos críticos a resolver estão concentrados em **segurança** (chave de API e RLS), e os de maior impacto para usuários são as **notificações em tempo real** e o **dashboard**.

A base de código está madura o suficiente para escalar com as melhorias acima sem necessidade de reescrita.

---

*Análise realizada com base nos arquivos: `AjudaFAQ.jsx`, `AnaliseEstatisticas.jsx`, `AssistenteIATecnico.jsx`, `AulaCard.jsx`, `AuthContext.jsx`, `ConsultaDisponibilidade.jsx`, `DesignarTecnicosModal.jsx`, `DownloadCronograma.jsx`, `EventosManutencao.jsx`, `GerenciarAulasAvancado.jsx`, `GerenciarEventosAvancado.jsx`, `GerenciarGrupos.jsx`, `ImportarAgendamento.jsx`, `ImportarCronograma.jsx` e outros.*
