# Auditoria de UX/UI — CronoLab
**Sistema de Gestão de Cronogramas de Laboratórios (CESMAC)**
Data da análise: 09/09/2026

> Este documento foi gerado a partir da leitura do código-fonte real do repositório (tema, CSS global, componentes compartilhados, páginas de gestão, formulários e listagens). As recomendações estão organizadas em **partes** para permitir execução incremental, do problema mais barato/urgente ao mais estrutural.

---

## 1. Resumo Executivo

O CronoLab tem uma **base de design decente** (tema MUI customizado com paleta institucional CESMAC, `responsiveFontSizes`, componentes compartilhados como `EmptyState`, `ResponsiveDataView`, `DialogConfirmacao`). O problema não é falta de sistema — é **inconsistência na aplicação dele**. Os principais padrões de falha encontrados, repetidos em várias telas:

1. **Cores hardcoded** (`#1976d2`, `#333`, `#fff`, `#ccc`, `#f44336`...) espalhadas em componentes, conflitando com os tokens definidos em `theme.js` (que usa `#1E7EC8` como azul institucional). Isso quebra o dark mode e a identidade visual em vários pontos.
2. **Erros engolidos silenciosamente** (`catch { setDados([]) }`), fazendo o usuário ver "nenhum resultado encontrado" quando na verdade **houve uma falha técnica** — o usuário não tem como diferenciar "não há dados" de "o sistema falhou".
3. **Estados de loading inconsistentes**: alguns componentes têm skeleton bonito (`ResponsiveDataView`), outros só um `CircularProgress` central, outros nada.
4. **Textos técnicos/internos vazando para a UI** (ex.: menção a "Firestore" e "Simulado" em um app que já migrou para Supabase/Postgres).
5. **Ações "fantasma"**: botões/chips que disparam `console.log` em vez de uma ação real, deixando o usuário sem retorno.
6. **Falta de padronização de feedback** (toast `sonner` configurado globalmente, mas usado de forma desigual — algumas telas usam só `Alert` inline, outras não dão feedback nenhum de sucesso).
7. **Ausência de foco em acessibilidade em interações customizadas** (menus, cards clicáveis, drag-and-drop de importação) — fora do padrão automático do MUI.

Nenhum desses pontos exige refazer o site. São ajustes **cirúrgicos e repetíveis** — por isso a Parte 3 deste documento traz um plano por fases.

---

## 2. O que foi analisado

- Sistema de tema: `src/theme.js`, `src/theme/tokens.ts`, `src/index.css`
- Bootstrap da aplicação: `src/index.jsx` (React Query, Toaster, AuthProvider)
- Componentes compartilhados: `EmptyState`, `DialogConfirmacao`, `ResponsiveDataView`, `ResultadoVisual`, `SmartAppBanner`, `UltimasAulasCard`, `UltimasExclusoesCard`, `UsageMonitor`, `AppModal`, `EventoCard`
- Páginas de fluxo principal: `PainelAvisos`, `ConsultaDisponibilidade`, `GerenciarAulasAvancado`, `GerenciarEventosAvancado`, `ImportarCronograma`, `ImportarAgendamento`, `AnaliseEstatisticas`, e as páginas em `src/pages/**`
- Estrutura completa de rotas/arquivos do repositório (listagem integral)

---

## 3. Problemas Transversais (afetam o site inteiro)

Cada item abaixo foi confirmado em pelo menos um arquivo real do projeto e provavelmente se repete em outros pontos com o mesmo padrão de código.

### 3.1 Cores fora do Design System
**Onde:** `EventoCard.jsx` (`#1976d2`, `#f44336` hardcoded em vez de `theme.palette.evento.*`), `ResultadoVisual.jsx` (`backgroundColor: mode === 'dark' ? '#333' : '#fff'`), `UsageMonitor.tsx` (`border: '1px solid #ccc'`), `index.css` (outline `#1976d2` enquanto `theme.js` define `#1E7EC8`/`#7EC8F0` como cor de foco).
**Impacto:** o app tem uma identidade visual CESMAC (azul `#1E7EC8`) mas em vários pontos volta ao azul padrão do Material UI (`#1976d2`), criando inconsistência visual perceptível ao usuário atento e quebrando completamente o dark mode em componentes com cor de fundo fixa.
**Sugestão:** eliminar toda cor hex solta no código; usar sempre `theme.palette.*` ou os tokens de `src/theme/tokens.ts`. Criar uma regra de lint (ESLint) que bloqueie strings hex em `sx`/`style` fora de `theme.js`.

### 3.2 Falhas silenciosas viram "vazio" para o usuário
**Onde:** `PainelAvisos.jsx` → `catch (e) { setAvisos([]); }` sem setar `error`; `UltimasExclusoesCard.jsx` → mesmo padrão.
**Impacto:** viola a heurística de Nielsen "visibilidade do status do sistema". Se a API cair, o coordenador vê "Nenhum aviso cadastrado no momento" e acredita que está tudo normal — pode tomar decisões erradas (ex.: não avisar sobre manutenção porque "não tinha aviso nenhum").
**Sugestão:** todo `catch` deve diferenciar "vazio real" de "erro de carregamento", sempre setando um estado de erro visível (`Alert severity="error"` ou toast) e, quando possível, um botão "Tentar novamente".

### 3.3 Estados de carregamento (loading) inconsistentes
**Onde:** `ResponsiveDataView` tem skeleton completo (cards no mobile, linhas de tabela no desktop); a maioria das outras telas usa apenas `<CircularProgress />` central, que causa "salto de layout" (o conteúdo aparece de repente em posição diferente) e não comunica *o que* está carregando.
**Sugestão:** adotar `Skeleton` (já usado em `ResponsiveDataView`) como padrão único de loading em todas as listas e cards, aposentando o spinner central exceto para ações pontuais (submit de formulário).

### 3.4 Vazamento de linguagem técnica interna na interface
**Onde:** `UsageMonitor.tsx` mostra ao usuário "Monitor de Uso do Firestore (Simulado)" — mas o projeto migrou para Supabase/Postgres (conforme `README.md`). Texto desatualizado, confuso e expõe detalhe de infraestrutura que não deveria estar na camada de UI de negócio.
**Sugestão:** revisar todos os textos de tela em busca de nomes de tecnologia/infra (Firestore, Firebase, "simulado", nomes de tabelas de banco) e substituí-los por linguagem de negócio ("Uso de consultas do plano atual"). Se for um painel de debug para devs, isolar atrás de uma rota `/admin/debug` clara.

### 3.5 Ações sem retorno real ("botões fantasma")
**Onde:** `ResultadoVisual.jsx` → `onClick={() => console.log('Ação Sugerida:', sugestao.comando)}` em um `Chip` clicável no Assistente de IA.
**Impacto:** usuário clica em uma sugestão de ação e nada visível acontece — parece bug.
**Sugestão:** toda ação clicável precisa de efeito perceptível (navegação, preenchimento de campo, disparo de toast) ou não deve parecer clicável.

### 3.6 Padrão de feedback (toast) subutilizado
**Onde:** `sonner` está configurado globalmente em `index.jsx` (`<Toaster position="bottom-right" richColors />`), mas boa parte das telas usa apenas `Alert` fixo dentro da página para sucesso/erro.
**Sugestão:** padronizar: **toast** para confirmações de ações rápidas (salvar, excluir, importar), **Alert inline** apenas para erros de validação de formulário ou estados persistentes que o usuário precisa continuar vendo.

### 3.7 Duplicação/Conflito entre CSS global e tema MUI
**Onde:** `index.css` redefine scrollbar, seleção de texto e `:focus` com cores antigas (`#1976d2`, gradiente azul CRA) que **duplicam e conflitam** com os overrides equivalentes já feitos em `theme.js` (`MuiCssBaseline`, `::-webkit-scrollbar`, `*:focus-visible`).
**Sugestão:** remover as regras duplicadas de `index.css` e manter uma única fonte de verdade (o tema MUI), deixando `index.css` só para o que o MUI não cobre (fontes, animações Tailwind).

### 3.8 Acessibilidade de componentes customizados
**Onde:** `EventoCard.jsx` usa `ButtonBase` para abrir/fechar (bom, é acessível), mas o `Checkbox` de seleção e o `IconButton` de menu ficam sobrepostos via `position: absolute` sobre a área clicável do card — pode gerar sobreposição de foco de teclado (tab order confuso) e alvo de toque pequeno em mobile.
**Sugestão:** revisar ordem de tabulação (`tabIndex`) em cards com múltiplas zonas clicáveis; garantir alvo de toque mínimo de 44×44px (o tema já define isso para `IconButton`/`MenuItem` — falta garantir nos elementos customizados fora do MUI puro).

### 3.9 Textos e emojis como parte da informação (não decorativos)
**Onde:** `PainelAvisos.jsx` usa `📢` no título; `UltimasAulasCard`/`UltimasExclusoesCard` usam `🎓`/`📖` como diferenciador funcional entre "Aula" x "Revisão" nas abas.
**Impacto:** emojis sem `aria-hidden` e sem texto equivalente para leitor de tela tornam a distinção "aula vs. revisão" **inacessível** para quem usa tecnologia assistiva — o emoji carrega significado funcional, não é só decoração.
**Sugestão:** manter o emoji como reforço visual, mas garantir que o texto do label (`Aulas`, `Revisões`) já comunique sozinho a diferença (o que já ocorre) e marcar o emoji com `aria-hidden="true"` para não poluir o leitor de tela.

### 3.10 Densidade de informação e hierarquia visual
**Onde:** cards de listagem (`UltimasAulasCard`, `UltimasExclusoesCard`) empilham 4-5 linhas de metadado com o mesmo peso visual (curso, laboratório, data, autor), competindo com o dado principal (nome da disciplina).
**Sugestão:** aplicar hierarquia tipográfica mais clara — 1 dado primário (negrito, maior), 1-2 secundários, o resto em `caption`/ícone, e considerar ocultar metadados menos usados atrás de "ver mais" (já existe padrão de `Collapse` em `EventoCard`, reaproveitar).

### 3.11 Confirmação de exclusão genérica
**Onde:** `DialogConfirmacao.tsx` é genérico e reutilizável (ótimo padrão!), mas como é usado em várias features (excluir aula, evento, grupo, usuário), é preciso garantir que a mensagem sempre deixe claro **o que exatamente** será excluído (nome/identificador do item), não um texto genérico tipo "Tem certeza?".
**Sugestão:** padronizar prop `message` para sempre incluir o nome do item entre aspas e, quando a ação for irreversível e de alto impacto (excluir usuário, excluir grupo inteiro), exigir digitação de confirmação (padrão "digite o nome para confirmar").

### 3.12 Responsividade: mobile como segunda classe em telas administrativas
**Onde:** `ResponsiveDataView` resolve bem tabela→card no mobile, mas essa lógica **não parece estar aplicada uniformemente** em todas as páginas de gestão (`GerenciarUsuarios`, `GerenciarAprovacoes`, `GerenciarPeriodos`) — várias ainda podem depender de tabelas MUI puras.
**Sugestão:** migrar todas as tabelas de gestão para o componente `ResponsiveDataView` já existente, em vez de reimplementar `Table` cru em cada página.

### 3.13 PWA / banner de instalação com atrito
**Onde:** `SmartAppBanner.tsx` some para sempre após 1 clique em "dispensar" (`localStorage`), sem opção de reabrir depois via configurações.
**Sugestão:** oferecer um atalho discreto em "Configurações de Perfil" para reexibir o convite de instalação, para usuários que dispensaram sem querer ou mudaram de ideia.

### 3.14 Consistência de vocabulário
**Onde:** o mesmo conceito aparece com nomes diferentes em arquivos distintos: "Aviso" (Painel de Avisos) vs. módulos de "Notificações" (`CentroNotificacoesDrawer`, `NotificarGrupo`, `notificationService`) — não fica claro para o usuário final se são a mesma coisa ou conceitos diferentes.
**Sugestão:** mapear todo o vocabulário do produto (Aviso, Notificação, Evento, Aula, Revisão, Designação, Proposta) em um pequeno glossário interno e garantir que cada termo apareça sempre com o mesmo rótulo em toda a UI.

---

## 4. Análise por Módulo/Página

> Organizado "por partes" — cada bloco pode ser tratado como uma tarefa independente.

### 4.1 Autenticação & Contexto (`AuthContext.jsx`)
- [ ] Garantir mensagens de erro de login humanizadas (não expor erro cru do Supabase/Firebase).
- [ ] Loading de sessão inicial não pode piscar a tela de login antes de confirmar que não há sessão (evitar "flash of unauthenticated content").
- [ ] Confirmar que há estado de "sessão expirada" com redirecionamento claro, não erro genérico.

### 4.2 Painel de Avisos (`PainelAvisos.jsx`)
- [ ] Corrigir tratamento de erro silencioso (ver 3.2).
- [ ] Adicionar filtro por prioridade (normal/importante/urgente) — hoje o usuário precisa expandir um por um.
- [ ] Indicar visualmente avisos não lidos (badge/negrito), hoje todos parecem "iguais" visualmente até serem expandidos.
- [ ] Considerar paginação/scroll infinito se a lista crescer (`select('*')` sem `limit` pode carregar tudo de uma vez).

### 4.3 Consulta de Disponibilidade (`ConsultaDisponibilidade.jsx`)
- [ ] Validar que resultado "sem laboratório disponível" tenha uma sugestão de ação (outro horário/outro laboratório), não só uma mensagem negativa.
- [ ] Garantir que filtros aplicados fiquem visíveis como chips removíveis (padrão comum em sistemas de busca), facilitando entender "por que" um resultado apareceu.

### 4.4 Grade de Disponibilidade (`GradeDisponibilidade.jsx`)
- [ ] Grades de horário são naturalmente densas: revisar contraste dos estados (livre/ocupado/manutenção) para não depender só de cor (adicionar padrão/ícone para daltonismo).
- [ ] Garantir navegação por teclado nas células da grade (setas), não só clique/toque.

### 4.5 Gestão de Aulas Avançada (`GerenciarAulasAvancado.jsx`) e Listagens (`ListagemCompletaAulas`, `ListagemMensalAulas`)
- [ ] Padronizar em `ResponsiveDataView` (ver 3.12).
- [ ] Ações em massa (selecionar múltiplas aulas) devem mostrar contador "X selecionadas" e barra de ação fixa, não exigir rolar até um botão.
- [ ] Estado vazio (nenhuma aula no período) deve sugerir ação ("Importar cronograma" ou "Adicionar aula"), reaproveitando o `action` do `EmptyState.tsx`.

### 4.6 Gestão de Eventos de Manutenção (`GerenciarEventosAvancado.jsx`, `EventosManutencao.jsx`, `EventoCard.jsx`)
- [ ] Corrigir cor hardcoded do card selecionado (`#1976d2` → `theme.palette.primary.main`).
- [ ] Resolver sobreposição de zonas clicáveis (checkbox/menu vs. expandir card) — ver 3.8.
- [ ] Adicionar confirmação com nome do evento ao excluir (ver 3.11).

### 4.7 Gestão de Grupos (`GerenciarGrupos.jsx`)
- [ ] Deixar explícito, na própria tela, o impacto de excluir/editar um grupo (quantas aulas/usuários são afetados) antes de confirmar.
- [ ] Busca/filtro de grupos por nome, se a lista puder crescer.

### 4.8 Designação de Técnicos (`DesignarTecnicosModal.jsx`)
- [ ] Modal de designação deve mostrar disponibilidade do técnico (conflitos de agenda) no momento da escolha, não só depois de salvar e dar erro.
- [ ] Feedback de sucesso via toast, não só fechar o modal silenciosamente.

### 4.9 Importação (`ImportarCronograma.jsx`, `ImportarAgendamento.jsx`, `UploadCronogramaExterno.jsx`, `UploadAulasForm.jsx`)
- [ ] Fluxos de importação são pontos de alto risco de erro do usuário — garantir **pré-visualização** dos dados antes de confirmar importação definitiva (checar se já existe).
- [ ] Mostrar progresso real de upload/parsing (barra de progresso, não spinner indefinido) para arquivos grandes.
- [ ] Erros de linha específica no arquivo (ex.: "linha 12: data inválida") devem ser listados um a um, não um erro genérico "falha na importação".
- [ ] Drag-and-drop de arquivo precisa de alternativa 100% funcional por clique/teclado (não depender só do drop).

### 4.10 Download de Cronograma (`DownloadCronograma.jsx`, `utils/exportPdf*.ts`)
- [ ] Indicar claramente o que será exportado (filtros ativos) antes de gerar o PDF, para evitar o usuário baixar o arquivo errado.
- [ ] Loading state durante geração do PDF (pode demorar) com possibilidade de cancelar.

### 4.11 Minhas Designações / Minhas Propostas (`MinhasDesignacoes.jsx`, `MinhasPropostas.jsx`)
- [ ] Status de proposta (pendente/aprovada/rejeitada) deve usar o mesmo sistema de cores/Chip em todas as telas (já existe padrão em `UltimasAulasCard.getStatusChip` — centralizar essa função em um util compartilhado em vez de reimplementar em cada componente).
- [ ] Ao rejeitar uma proposta, mostrar o motivo (se houver) de forma destacada, não escondido em um "ver mais".

### 4.12 Análise de Estatísticas (`AnaliseEstatisticas.jsx`, `pages/Gerenciar/AnaliseAulas.jsx`, `AnaliseEventos.jsx`)
- [ ] Gráficos precisam de alternativa textual/tabular para acessibilidade (leitor de tela não lê gráfico).
- [ ] Definir paleta de gráfico fixa e consistente com `theme.palette.curso`/`evento` (hoje o risco é cada gráfico usar cores aleatórias da lib de charts).
- [ ] Estado vazio de "sem dados suficientes para análise" com explicação (ex.: "cadastre pelo menos X aulas para gerar estatísticas").

### 4.13 Aprovações (`pages/Gerenciar/GerenciarAprovacoes.jsx`)
- [ ] Fila de aprovação deve ter ação rápida (aprovar/rejeitar) direto na lista, sem precisar abrir detalhe, para tarefas repetitivas do coordenador.
- [ ] Ordenar por mais antigo primeiro (evitar itens esquecidos na fila).

### 4.14 Gestão de Avisos, Períodos e Usuários (`GerenciarAvisos`, `GerenciarPeriodos`, `GerenciarUsuarios`)
- [ ] Formulários de criação/edição devem validar em tempo real (inline), não só no submit.
- [ ] `GerenciarUsuarios`: mudança de papel/permissão de um usuário é uma ação sensível — deve pedir confirmação explícita (`DialogConfirmacao`) e, idealmente, registrar em log visível para auditoria.
- [ ] `GerenciarPeriodos`: deixar claro visualmente qual período está "ativo" no momento (destaque, não só uma coluna de data).

### 4.15 Assistente de IA (`pages/IA/AssistenteIA.jsx`, `AssistenteIATecnico.jsx`, `ResultadoVisual.jsx`, módulo `ia-estruturada/`)
- [ ] Corrigir chips de "ação sugerida" que não fazem nada (ver 3.5) — devem executar a ação ou preencher o campo de comando.
- [ ] Corrigir cores hardcoded que quebram dark mode em `ResultadoVisual` (ver 3.1).
- [ ] Indicador de "digitando..."/"processando" enquanto a IA responde, com possibilidade de cancelar consultas longas.
- [ ] Se a IA não entender o pedido, sugerir 2-3 exemplos de pergunta válida em vez de só dizer "não entendi".

### 4.16 Notificações (`CentroNotificacoesDrawer.tsx`, `NotificarGrupo.tsx`, `hooks/useNotificacoes.ts`, `services/*Push*`)
- [ ] Unificar vocabulário com "Avisos" (ver 3.14) ou explicar a diferença na própria UI (ex.: subtítulo "Notificações são alertas pessoais; Avisos são comunicados gerais").
- [ ] Badge de contagem não lida deve ter limite visual (ex.: "9+") em vez de números muito grandes quebrando o layout do sino.
- [ ] Ação "marcar todas como lidas" deve ter confirmação leve (toast com "desfazer"), não ser irreversível sem aviso.

### 4.17 Perfil / Configurações (`pages/Perfil/ConfiguracoesPerfil.jsx`)
- [ ] Alterações de preferências devem salvar com feedback imediato (toast "Preferências salvas"), não exigir um botão "Salvar" separado se outras partes do app já usam autosave, para manter consistência de padrão.
- [ ] Se houver alternância de tema claro/escuro aqui, garantir que ela reflita instantaneamente (sem reload) — já suportado pelo `getAppTheme(mode)`.

### 4.18 Ajuda/FAQ (`AjudaFAQ.jsx`)
- [ ] Adicionar busca dentro do FAQ se a lista crescer.
- [ ] Garantir que perguntas usem `Accordion` do MUI (já estilizado no tema) para acessibilidade nativa (teclado, `aria-expanded`), em vez de `Collapse` manual sem os atributos ARIA equivalentes.

### 4.19 Componentes compartilhados
| Componente | Situação | Ação recomendada |
|---|---|---|
| `EmptyState.tsx` | Bom padrão, reutilizável | Garantir uso em **100%** das listas vazias do site (hoje pode não estar em todas) |
| `DialogConfirmacao.tsx` | Bom padrão, genérico | Padronizar mensagem com nome do item (3.11) |
| `ResponsiveDataView.jsx` | Ótimo padrão mobile-first | Expandir uso para todas as tabelas de gestão (3.12) |
| `ResultadoVisual.jsx` | Cores hardcoded, ação fantasma | Corrigir 3.1 e 3.5 |
| `UsageMonitor.tsx` | Texto técnico desatualizado | Corrigir 3.4, mover para área de admin se for debug interno |
| `SmartAppBanner.tsx` | Bom, mas sem "reabrir depois" | Ver 3.13 |
| `AppModal.tsx` | Base de modal | Garantir que todo modal do site passe por aqui (evitar `Dialog` MUI cru duplicando estilos) |

---

## 5. Checklist de Acessibilidade (WCAG, aplicável ao site inteiro)

- [ ] Todo ícone/emoji funcional tem texto equivalente ou `aria-label`.
- [ ] Contraste mínimo 4.5:1 em texto normal (revisar especialmente `text.secondary` sobre `background.paper` no modo escuro).
- [ ] Nenhuma informação é passada **só por cor** (status de aprovação, disponibilidade de laboratório, prioridade de aviso) — sempre combinar com ícone/texto.
- [ ] Todo elemento clicável customizado (`Box onClick`, `div onClick`) é navegável por teclado e tem `role`/`tabIndex` adequados — preferir sempre `Button`/`ButtonBase`/`IconButton` do MUI.
- [ ] Modais fazem *focus trap* e devolvem o foco ao elemento que os abriu ao fechar (verificar se `AppModal`/`Dialog` cobrem isso — o MUI faz por padrão, mas confirmar em modais customizados).
- [ ] Formulários têm `label` associado a cada campo (não só `placeholder`).

## 6. Checklist de Responsividade

- [ ] Toda tabela de gestão usa `ResponsiveDataView` (ou equivalente) em vez de `Table` MUI cru.
- [ ] Alvo de toque mínimo 44×44px em ícones de ação em listas densas no mobile.
- [ ] Modais em mobile ocupam a tela de forma confortável (o tema já define isso em `MuiDialog` — validar em telas com formulários longos, como importação).
- [ ] Menus de navegação colapsam corretamente em telas pequenas sem esconder ações críticas.

## 7. Checklist de Feedback e Estado do Sistema

- [ ] Toda ação de escrita (criar/editar/excluir) dá feedback via toast (`sonner`) em até 1s.
- [ ] Todo erro de rede/API é comunicado ao usuário (nunca um `catch` silencioso — ver 3.2).
- [ ] Todo carregamento usa `Skeleton` consistente com o layout final (evita "pulo" de conteúdo).
- [ ] Toda ação destrutiva usa `DialogConfirmacao` com o nome do item afetado.

---

## 8. Plano de Ação por Fases

### Fase 1 — Correções rápidas (1-3 dias, baixo risco)
1. Substituir cores hex hardcoded por tokens do tema (3.1) — busca e substituição guiada.
2. Corrigir textos técnicos desatualizados (Firestore/Simulado) em `UsageMonitor` (3.4).
3. Corrigir chip de "ação sugerida" no Assistente de IA que só faz `console.log` (3.5).
4. Remover regras duplicadas/conflitantes de `index.css` (3.7).
5. Adicionar `aria-hidden` em emojis decorativos/funcionais (3.9).

### Fase 2 — Consistência estrutural (1-2 semanas)
6. Padronizar tratamento de erro em todos os `catch` de fetch (nunca esconder erro como "vazio") (3.2).
7. Migrar todas as tabelas de páginas de gestão para `ResponsiveDataView` (3.12, 4.5, 4.14).
8. Centralizar a função `getStatusChip` (status de proposta/aula) em um único util compartilhado.
9. Padronizar uso de toast vs. Alert inline em todo o site (3.6).
10. Padronizar mensagens do `DialogConfirmacao` com nome do item (3.11).

### Fase 3 — Refinamento de experiência (2-4 semanas)
11. Revisar acessibilidade de gráficos (alternativa tabular) em `AnaliseEstatisticas`/`AnaliseAulas`/`AnaliseEventos`.
12. Melhorar fluxo de importação com pré-visualização e erros por linha (4.9).
13. Adicionar ações rápidas (aprovar/rejeitar inline) na fila de aprovações (4.13).
14. Unificar vocabulário Avisos vs. Notificações (3.14) ou diferenciar claramente na UI.
15. Revisar hierarquia visual dos cards de listagem (3.10).

### Fase 4 — Polimento contínuo
16. Criar um pequeno guia de estilo interno (glossário + regras de cor/tipografia) para novos componentes não repetirem os mesmos desvios.
17. Configurar regra de lint para bloquear cores hex fora de `theme.js`.
18. Testes manuais de navegação 100% por teclado nas telas administrativas mais usadas.

---

## 9. Observação final

Os problemas listados não indicam falta de qualidade da equipe — o projeto já tem padrões bons (`ResponsiveDataView`, `EmptyState`, `DialogConfirmacao`, tema com tokens de cor). O ganho de UX aqui é principalmente **fazer esses padrões existentes serem usados em 100% do site**, em vez de criar sistemas novos. Isso torna a Fase 1 e 2 deste plano de execução rápida e de baixo risco técnico.
