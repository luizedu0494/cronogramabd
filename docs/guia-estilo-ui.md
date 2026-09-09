# Guia de Estilo de UI & Padrões Frontend — CronoLab (CESMAC)

Este documento estabelece as diretrizes de design e padrões de desenvolvimento frontend para o projeto **CronoLab**.

---

## 1. Identidade Visual & Cores Institucionais

Todas as telas devem utilizar estritamente o tema Material UI configurado em [`src/theme.js`](file:///c:/Users/Luiz/Documents/cronograma-lab-frontend/src/theme.js).

### Regras de Cores:
- **Proibido usar cores hex hardcoded** (`#1976d2`, `#333`, `#fff`, `#ccc`) diretamente nos componentes via `sx` ou `style`.
- Usar sempre os tokens da paleta do tema:
  - Azul Institucional Primário: `theme.palette.primary.main` (`#1E7EC8`)
  - Fundo de Cards/Papéis: `theme.palette.background.paper`
  - Textos Principais e Secundários: `theme.palette.text.primary` e `theme.palette.text.secondary`
  - Bordas e Divisores: `theme.palette.divider` ou `borderColor: 'divider'`

---

## 2. Feedback ao Usuário & Visibilidade de Erro

- **Toasts (`sonner`)**: Utilizados para confirmação de ações rápidas do usuário (salvar, excluir, aprovar, rejeitar, copiar).
- **Alerts inline (`<Alert severity="...">`)**: Utilizados para estados persistentes na página, validação de campos em formulários e alertas de rede.
- **Tratamento de Exceções (`catch`)**: NUNCA redefinir o estado da lista para vazio `[]` silenciosamente sem setar um estado de erro visível. Todo bloco `catch` deve comunicar a falha de rede/API ao usuário com mensagem clara e opção de tentar novamente.

---

## 3. Reutilização de Componentes Reutilizáveis

- **Status Chips**: Usar a função centralizada `getStatusChip(status)` em [`src/utils/statusChipUtils.jsx`](file:///c:/Users/Luiz/Documents/cronograma-lab-frontend/src/utils/statusChipUtils.jsx).
- **Confirmação de Ações Destrutivas**: Toda exclusão de item ou ação irreversível deve utilizar [`DialogConfirmacao.tsx`](file:///c:/Users/Luiz/Documents/cronograma-lab-frontend/src/components/DialogConfirmacao.tsx), informando o nome ou título do objeto afetado entre aspas.
- **Listas e Tabelas Responsivas**: Telas de gestão administrativa com tabelas/listas devem implementar suporte mobile responsivo (`ResponsiveDataView` ou layout flexbox adaptável).

---

## 4. Acessibilidade (WCAG)

- **Emojis**: Emojis decorativos ou funcionais (`📢`, `🎓`, `📖`) devem ser envolvidos em `<span role="img" aria-hidden="true">` para evitar leitura redundante em leitores de tela.
- **Alvos de Toque**: Garantir tamanho mínimo de alvo de clique/toque de `44x44px` em dispositivos móveis.
