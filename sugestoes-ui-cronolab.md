# 🎨 Sugestões de Melhoria de UI/UX — CronoLab

> Análise baseada nas telas capturadas (Dashboard e Cronograma) e no código-fonte do projeto.  
> Foco em **acessibilidade**, **legibilidade de labels truncados** e **consistência visual**.

---

## 1. Problema Principal: Truncamento de Texto em Menus e Filtros (`"C..."`)

### ❌ Situação atual

Nos selects e chips de filtro, nomes longos como **"Engenharia de Software"** ou **"Laboratório de Informática"** são cortados com reticências (`...`), tornando a interface ilegível e inacessível.

```
┌──────────────────────────┐
│ 🏫  C...              ▾  │  ← ilegível!
└──────────────────────────┘
```

### ✅ Soluções recomendadas

#### 1.1 — Select com `renderValue` personalizado + Tooltip

No MUI, use `renderValue` para exibir a sigla ou abreviação segura, e envolva com `Tooltip` para revelar o nome completo no hover/focus:

```jsx
import Tooltip from '@mui/material/Tooltip';

<Tooltip title={cursoSelecionado?.nome ?? ''} placement="top" arrow>
  <Select
    value={curso}
    onChange={handleChange}
    renderValue={(value) => {
      const curso = cursos.find(c => c.id === value);
      return curso
        ? `${curso.sigla ?? curso.nome.slice(0, 12)}...`
        : 'Todos';
    }}
    sx={{ minWidth: 180 }} // largura mínima garante que a sigla apareça
  >
    {cursos.map(c => (
      <MenuItem key={c.id} value={c.id}>
        <ListItemText
          primary={c.nome}
          secondary={c.sigla}
        />
      </MenuItem>
    ))}
  </Select>
</Tooltip>
```

#### 1.2 — Chips de filtro: texto completo ou sigla + `title`

Nunca truncar chips. Use a sigla oficial do curso ou abrevie de forma inteligente:

```jsx
// ❌ EVITAR
<Chip label={curso.nome} />  // "Engenharia de Softw..."

// ✅ PREFERIR
<Chip
  label={curso.sigla || curso.nome}   // ex: "ES" ou "Eng. Software"
  title={curso.nome}                  // acessível via hover/screen reader
/>
```

#### 1.3 — Largura mínima obrigatória nos selects

```js
// tailwind.config.js ou inline sx
sx={{ minWidth: 200, maxWidth: '100%' }}
```

#### 1.4 — Drawer/Bottom Sheet para filtros avançados em mobile

No mobile (viewport < 600px), substitua o painel expansível de filtros por um **Bottom Sheet** do MUI (`SwipeableDrawer`), onde há espaço suficiente para exibir labels completas:

```jsx
<SwipeableDrawer
  anchor="bottom"
  open={filtrosAbertos}
  onClose={() => setFiltrosAbertos(false)}
  PaperProps={{ sx: { borderRadius: '16px 16px 0 0', p: 2 } }}
>
  {/* Filtros com labels completas — sem truncamento */}
</SwipeableDrawer>
```

---

## 2. Logo e Imagens: Centralização e Consistência

### ❌ Situação atual

O logo da CESMAC está alinhado à esquerda na AppBar, sem margem consistente, e a imagem pode ficar distorcida em viewports estreitas.

### ✅ Soluções recomendadas

#### 2.1 — Logo centralizado em mobile

```jsx
<AppBar>
  <Toolbar sx={{ justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
    {/* Em mobile, logo centralizado */}
    <Box sx={{
      position: { xs: 'absolute', sm: 'static' },
      left: { xs: '50%', sm: 'auto' },
      transform: { xs: 'translateX(-50%)', sm: 'none' },
    }}>
      <img
        src="/logo-cesmac.png"
        alt="CESMAC Centro Universitário"
        style={{ height: 40, width: 'auto', objectFit: 'contain' }}
      />
    </Box>
  </Toolbar>
</AppBar>
```

#### 2.2 — `objectFit: contain` em todas as imagens de conteúdo

```css
/* index.css — regra global */
img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}
```

#### 2.3 — Avatares e ícones: tamanho fixo com fallback acessível

```jsx
<Avatar
  src={usuario.foto}
  alt={usuario.nome}
  sx={{ width: 40, height: 40 }}
>
  {/* Fallback: iniciais do nome */}
  {usuario.nome?.charAt(0).toUpperCase()}
</Avatar>
```

---

## 3. Cards do Dashboard: Acessibilidade e Hierarquia Visual

### ❌ Situação atual

Os cards de estatísticas (Aulas Hoje, Revisões Hoje, etc.) têm o número grande mas o label em `text-transform: uppercase` com tamanho reduzido, o que dificulta a leitura para usuários com baixa visão.

```
┌─────────────────────────┐
│  🕐   48                │
│       🎓 AULAS HOJE     │  ← uppercase + tiny = ilegível
└─────────────────────────┘
```

### ✅ Soluções recomendadas

#### 3.1 — Hierarquia tipográfica clara

```jsx
<Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
  <IconBox>{/* ícone */}</IconBox>
  <Box>
    <Typography variant="h4" fontWeight={700} color="text.primary">
      48
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ textTransform: 'none', letterSpacing: 0 }} // ← sem uppercase
    >
      Aulas hoje
    </Typography>
  </Box>
</Card>
```

#### 3.2 — `aria-label` descritivo nos cards

```jsx
<Card
  role="region"
  aria-label="48 aulas agendadas para hoje"
>
  ...
</Card>
```

#### 3.3 — Contraste mínimo WCAG AA (4.5:1)

Verifique os pares de cor usados nos labels. O azul `#1976d2` sobre fundo cinza `#f5f5f5` tem contraste de ~4.7:1 — aprovado. Mas textos secundários muito claros (`#9e9e9e`) sobre fundo branco têm ~2.8:1 — **reprovado**. Use no mínimo `#757575` para texto secundário.

```js
// theme/tokens.ts — ajuste recomendado
text: {
  secondary: '#616161', // contraste 5.9:1 sobre branco ✅
}
```

---

## 4. Filtros Avançados: UX e Responsividade

### ❌ Situação atual

O painel "Filtros Avançados & Perspectiva" ocupa espaço valioso mesmo quando não está sendo usado, e os botões de filtro rápido (`L...`, `O...`, `T...`) são completamente ilegíveis.

### ✅ Soluções recomendadas

#### 4.1 — Chips de filtro rápido com labels completas

```jsx
// ❌ EVITAR — botões com texto truncado
<Button>L...</Button>
<Button>O...</Button>
<Button>T...</Button>

// ✅ PREFERIR — chips expansíveis ou com scroll horizontal
<Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
  {laboratorios.map(lab => (
    <Chip
      key={lab.id}
      label={lab.sigla || lab.nome}
      title={lab.nome}           // tooltip nativo
      onClick={() => filtrar(lab)}
      variant={selecionado === lab.id ? 'filled' : 'outlined'}
      sx={{ flexShrink: 0 }}    // ← impede que o chip encolha e trunce
    />
  ))}
</Box>
```

#### 4.2 — Filtros colapsáveis com estado persistido

```jsx
const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

<Accordion expanded={filtrosExpandidos} onChange={() => setFiltrosExpandidos(v => !v)}>
  <AccordionSummary expandIcon={<FilterListIcon />}>
    <Typography>Filtros avançados</Typography>
    {qtdFiltrosAtivos > 0 && (
      <Badge badgeContent={qtdFiltrosAtivos} color="primary" sx={{ ml: 1 }} />
    )}
  </AccordionSummary>
  <AccordionDetails>
    {/* conteúdo dos filtros */}
  </AccordionDetails>
</Accordion>
```

#### 4.3 — Campo de busca com placeholder descritivo

```jsx
<TextField
  placeholder="Buscar por assunto, professor ou curso..."
  InputProps={{ startAdornment: <SearchIcon /> }}
  fullWidth
  inputProps={{ 'aria-label': 'Buscar aulas por assunto' }}
/>
```

---

## 5. Navegação e AppBar

### ✅ Melhorias recomendadas

#### 5.1 — Botão de menu hambúrguer com `aria-label`

```jsx
<IconButton
  aria-label="Abrir menu de navegação"
  aria-expanded={menuAberto}
  onClick={toggleMenu}
>
  <MenuIcon />
</IconButton>
```

#### 5.2 — Ícone de notificação com contagem acessível

```jsx
<IconButton aria-label={`${qtdNaoLidas} notificações não lidas`}>
  <Badge badgeContent={qtdNaoLidas} color="error">
    <NotificationsIcon />
  </Badge>
</IconButton>
```

#### 5.3 — Modo escuro: toggle com estado persistido no localStorage

```jsx
const [darkMode, setDarkMode] = useState(
  () => localStorage.getItem('theme') === 'dark'
);

const toggleDark = () => {
  setDarkMode(prev => {
    localStorage.setItem('theme', !prev ? 'dark' : 'light');
    return !prev;
  });
};
```

---

## 6. Navegação de Calendário (Cronograma)

### ✅ Melhorias recomendadas

#### 6.1 — Botões de semana com `aria-label` dinâmico

```jsx
<IconButton aria-label="Semana anterior">
  <ChevronLeftIcon />
</IconButton>

<Typography role="heading" aria-level={2}>
  06 set – 12 set 2026
</Typography>

<IconButton aria-label="Próxima semana">
  <ChevronRightIcon />
</IconButton>
```

#### 6.2 — Botão "Hoje" deve ter foco visível

```css
/* index.css */
.btn-hoje:focus-visible {
  outline: 3px solid #1976d2;
  outline-offset: 2px;
}
```

---

## 7. Tokens de Design — Padronização Sugerida

Centralize no `src/theme/tokens.ts`:

```ts
export const tokens = {
  color: {
    primary:    '#1565C0',  // azul CESMAC
    secondary:  '#00897B',  // verde-azulado
    error:      '#C62828',
    warning:    '#EF6C00',
    success:    '#2E7D32',
    textPrimary:   '#1A1A1A',
    textSecondary: '#616161',  // mínimo para WCAG AA
    background:    '#F0F2F5',
    surface:       '#FFFFFF',
  },
  radius: {
    card:   '12px',
    chip:   '8px',
    button: '8px',
    dialog: '16px',
  },
  spacing: {
    cardPad:  '16px',
    sectionGap: '24px',
  },
  font: {
    family: "'Inter', 'Roboto', sans-serif",
    scaleBase: '16px',
  },
  minWidths: {
    select: '180px',   // ← previne truncamento
    chip:   'fit-content',
  },
};
```

---

## 8. Checklist de Acessibilidade (WCAG 2.1 AA)

| Item | Status atual | Ação recomendada |
|---|---|---|
| Contraste de texto | ⚠️ Parcial | Ajustar `text.secondary` para `#616161` |
| Labels nos ícones | ❌ Faltando | Adicionar `aria-label` em todos os `IconButton` |
| Foco visível | ⚠️ Parcial | Garantir `focus-visible` em todos os interativos |
| Texto sem truncamento | ❌ Problema | Implementar tooltips + largura mínima |
| Hierarquia de headings | ⚠️ Parcial | Usar `role="heading"` ou tags `<h1>`–`<h3>` semânticas |
| Alt text nas imagens | ⚠️ Parcial | Garantir `alt` descritivo em todas as `<img>` |
| Campos de formulário | ⚠️ Parcial | Associar `<label>` a cada `<input>` via `htmlFor` |
| Navegação por teclado | ⚠️ Parcial | Testar fluxo completo com Tab/Shift+Tab/Enter |

---

## 9. Resumo das Prioridades

| Prioridade | Problema | Impacto |
|---|---|---|
| 🔴 Alta | Texto truncado em selects/chips (`C...`) | Ilegibilidade total |
| 🔴 Alta | `aria-label` ausente nos IconButtons | Falha grave de acessibilidade |
| 🟠 Média | Contraste de texto secundário insuficiente | Dificulta leitura para baixa visão |
| 🟠 Média | Logo/imagens sem `objectFit: contain` | Distorção em viewports estreitas |
| 🟡 Baixa | Labels em uppercase nos cards | Leiturabilidade reduzida |
| 🟡 Baixa | Filtros avançados sempre visíveis | Poluição visual no mobile |

---

> **Nota:** Todas as sugestões de código são compatíveis com o stack atual do projeto  
> (React 19 + MUI v7 + Tailwind CSS + Vite 7 + TypeScript).  
> Priorize as mudanças de **Alta** prioridade — são as que mais impactam usuários reais hoje.
