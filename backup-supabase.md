# Backup & Restauração de Dados — CronoLab (versão Supabase)

> Documento de especificação técnica para a funcionalidade **"Backup do Sistema"**, exclusiva para o perfil **Coordenador**, no projeto `luizedu0494-cronogramabd` (Supabase / PostgreSQL).

---

## 1. Contexto (análise do repositório)

Esta é a segunda versão do CronoLab (a primeira usa Firebase/Firestore). Aqui o backend é **Supabase (Postgres)**, com schema definido em `supabase/full_schema.sql`. As tabelas relevantes para o backup são:

| Tabela | Descrição | Equivalente na versão Firebase |
|---|---|---|
| `aulas` | Aulas, provas e revisões (campo `tipo_atividade`, flags `is_revisao` / `is_prova`) | coleção `aulas` |
| `eventos_manutencao` | Eventos de manutenção, feriados, giros | coleção `eventosManutencao` |
| `periodos_sem_atividade` | Recessos/férias | coleção `periodosSemAtividade` |
| `grupos` (+ `grupo_membros`) | Grupos e membros | coleção `grupos` |
| `avisos` | Avisos do coordenador | coleção `avisos` |
| `users` | Usuários (role, status) | coleção `users` |
| `notificacoes`, `logs`, `config`, `telegram_vinculos_pendentes`, `push_subscriptions`, `push_tokens_mobile` | Dados operacionais/técnicos | sem equivalente direto — **não entram no backup funcional** |

**Conclusão da análise:** assim como na versão Firebase, "prova" e "revisão" **não são tabelas separadas** — são linhas de `aulas` diferenciadas por `tipo_atividade`, `is_prova` e `is_revisao`. Um único export de `aulas` cobre tudo.

Hoje o `DownloadCronograma.jsx` desta versão (igual ao da versão Firebase) só gera **.ics/PDF** de calendário filtrado por mês — não é um backup reimportável nem cobre `grupos`, `avisos`, `periodos_sem_atividade`.

---

## 2. Regra de acesso (somente Coordenador)

O padrão de checagem de perfil já usado no projeto:

```jsx
const isCoordenador = userProfile?.role === 'coordenador';

if (!isCoordenador) {
  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h6" color="error">Acesso Negado</Typography>
      <Typography variant="body1">Apenas coordenadores podem gerar ou restaurar backups.</Typography>
    </Container>
  );
}
```

O schema atual usa **RLS "acesso liberado para desenvolvimento"** (`FOR ALL USING (true)`), o que é um risco de segurança de produção — vale endurecer isso junto com a feature de backup, criando políticas específicas:

```sql
-- Função auxiliar: verifica se o usuário autenticado é coordenador
create or replace function public.is_coordenador()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text and role = 'coordenador'
  );
$$;

-- Política de leitura em massa (export) restrita a coordenador
-- (mantém as políticas normais já existentes para operações do dia a dia)
create policy "coordenador pode exportar aulas"
  on public.aulas for select
  using (is_coordenador());

create policy "coordenador pode exportar eventos"
  on public.eventos_manutencao for select
  using (is_coordenador());
```

> Aplicar o mesmo padrão para `periodos_sem_atividade`, `grupos`, `grupo_membros` e `avisos`.

---

## 3. Formato do arquivo de backup

Mesmo formato **JSON universal** usado na versão Firebase (facilita migração cruzada entre as duas versões — ver seção 6):

```json
{
  "meta": {
    "app": "CronoLab",
    "backendOrigem": "supabase",
    "versaoFormato": "1.0",
    "geradoEm": "2026-09-10T14:32:00.000Z",
    "geradoPor": { "uid": "abc123", "nome": "Coordenador Fulano" },
    "instituicao": "CESMAC"
  },
  "colecoes": {
    "aulas": [ { "...": "..." } ],
    "eventos_manutencao": [ { "...": "..." } ],
    "periodos_sem_atividade": [ { "...": "..." } ],
    "grupos": [ { "...": "..." } ],
    "avisos": [ { "...": "..." } ]
  }
}
```

Notas:
- Timestamps do Postgres (`TIMESTAMPTZ`) já vêm em **ISO 8601** ao serem lidos via `supabase-js` — não precisa de conversão manual como no Firestore.
- O `id` (UUID) de cada linha é mantido como `_id` só como referência, e **não deve ser reutilizado** como PK na importação (evita colisão/erro de chave duplicada).
- `users`, `notificacoes`, `logs`, `config`, `push_subscriptions`, `push_tokens_mobile`, `telegram_vinculos_pendentes` ficam **fora do backup por padrão** (dados sensíveis ou puramente operacionais).

---

## 4. Exportação (gerar backup)

```jsx
// src/utils/backupExport.js
import { supabase } from '../supabaseClient';
import { saveAs } from 'file-saver';

const TABELAS_BACKUP = ['aulas', 'eventos_manutencao', 'periodos_sem_atividade', 'grupos', 'avisos'];

export async function gerarBackupCompleto(userProfile) {
  const colecoes = {};

  for (const tabela of TABELAS_BACKUP) {
    const { data, error } = await supabase.from(tabela).select('*');
    if (error) throw new Error(`Falha ao exportar ${tabela}: ${error.message}`);

    colecoes[tabela] = data.map(({ id, ...resto }) => ({ _id: id, ...resto }));
  }

  // grupo_membros é filho de grupos — anexa por grupo_id
  const { data: membros } = await supabase.from('grupo_membros').select('*');
  colecoes.grupos = colecoes.grupos.map(g => ({
    ...g,
    _membros: membros.filter(m => m.grupo_id === g._id).map(({ id, ...r }) => ({ _id: id, ...r })),
  }));

  const backup = {
    meta: {
      app: 'CronoLab',
      backendOrigem: 'supabase',
      versaoFormato: '1.0',
      geradoEm: new Date().toISOString(),
      geradoPor: { uid: userProfile?.uid, nome: userProfile?.name },
      instituicao: 'CESMAC',
    },
    colecoes,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const dataStr = new Date().toISOString().slice(0, 10);
  saveAs(blob, `cronolab-backup-supabase-${dataStr}.json`);

  return backup;
}
```

### Sugestão de UI (tela "Backup do Sistema")

- Botão único **"Baixar backup completo"**.
- Resumo pós-export: *"Backup gerado: 842 aulas, 37 eventos, 5 grupos, 12 avisos."*
- Mostrar data do último backup (pode ser lida da tabela `config`, chave `ultimo_backup`, só para exibição).

---

## 5. Importação (restaurar / mesclar backup)

Mesma exigência: **comparar com o que já existe e incluir só o que for novo**, sem duplicar.

### 5.1 Estratégia de comparação

Como o `id` é um UUID gerado pelo Postgres (e diverge entre ambientes), a comparação usa uma **chave natural** por tabela — os mesmos critérios da versão Firebase, adaptados para os nomes de coluna em `snake_case`:

| Tabela | Campos da chave natural |
|---|---|
| `aulas` | `laboratorio` + `data_inicio` + `assunto` |
| `eventos_manutencao` | `laboratorio` + `data_inicio` + `data_fim` + `titulo` |
| `periodos_sem_atividade` | `data_inicio` + `data_fim` + `descricao` |
| `grupos` | `nome` (normalizado) |
| `avisos` | `titulo` + `created_at` (arredondado ao minuto) |

```jsx
// src/utils/backupImport.js
import { supabase } from '../supabaseClient';

function normalizar(str) {
  return (str || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function chaveNatural(tabela, item) {
  switch (tabela) {
    case 'aulas':
      return `${normalizar(item.laboratorio)}|${item.data_inicio}|${normalizar(item.assunto)}`;
    case 'eventos_manutencao':
      return `${normalizar(item.laboratorio)}|${item.data_inicio}|${item.data_fim}|${normalizar(item.titulo)}`;
    case 'periodos_sem_atividade':
      return `${item.data_inicio}|${item.data_fim}|${normalizar(item.descricao)}`;
    case 'grupos':
      return normalizar(item.nome);
    case 'avisos':
      return `${normalizar(item.titulo)}|${(item.created_at || '').slice(0, 16)}`;
    default:
      return item._id;
  }
}

export async function analisarBackupParaImportacao(backupJson) {
  const relatorio = {};

  for (const [tabela, itens] of Object.entries(backupJson.colecoes)) {
    const { data: existentes, error } = await supabase.from(tabela).select('*');
    if (error) throw new Error(`Falha ao ler ${tabela}: ${error.message}`);

    const chavesExistentes = new Set(existentes.map(e => chaveNatural(tabela, e)));

    const novos = [];
    const jaExistem = [];

    for (const item of itens) {
      const chave = chaveNatural(tabela, item);
      (chavesExistentes.has(chave) ? jaExistem : novos).push(item);
    }

    relatorio[tabela] = { novos, jaExistem, totalNoBackup: itens.length };
  }

  return relatorio;
}

export async function importarSomenteNovos(relatorio, userProfile) {
  for (const [tabela, { novos }] of Object.entries(relatorio)) {
    if (novos.length === 0) continue;

    const linhas = novos.map(({ _id, _membros, ...resto }) => ({
      ...resto,
      origem: 'backup_importado',
    }));

    // Insere em lotes de 500 (limite prático de payload)
    for (let i = 0; i < linhas.length; i += 500) {
      const lote = linhas.slice(i, i + 500);
      const { error } = await supabase.from(tabela).insert(lote);
      if (error) throw new Error(`Falha ao importar em ${tabela}: ${error.message}`);
    }
  }

  // Log de auditoria na própria tabela "logs" já existente no schema
  await supabase.from('logs').insert({
    type: 'importacao_backup',
    payload: {
      por: userProfile?.name,
      resumo: Object.fromEntries(
        Object.entries(relatorio).map(([t, r]) => [t, { novos: r.novos.length, ignorados: r.jaExistem.length }])
      ),
    },
  });
}
```

> **Alternativa mais robusta (recomendada para produção):** mover essa lógica de comparação para uma **função `plpgsql`** (`import_backup_aulas(jsonb)`, chamada via `supabase.rpc(...)`), usando `ON CONFLICT DO NOTHING` com uma **constraint `UNIQUE`** composta (ex.: `UNIQUE (laboratorio, data_inicio, assunto)` em `aulas`). Isso evita condições de corrida (dois coordenadores importando ao mesmo tempo) e é mais rápido que ler tudo para o frontend comparar. O fluxo do frontend (análise prévia + confirmação) continua o mesmo — só a checagem final de duplicidade passa a ser garantida pelo banco.

### 5.2 Fluxo de UI recomendado (2 passos)

1. **Selecionar arquivo** `.json` → `analisarBackupParaImportacao`.
2. **Prévia**: *"120 registros no backup, 95 já existem (ignorados), **25 novos** serão adicionados"* + tabela de conferência.
3. **Confirmar importação** → `importarSomenteNovos`.
4. Exibir resultado final e registrar em `logs`.

---

## 6. Compatibilidade com a versão Firebase (migração cruzada)

Como este Supabase é a **segunda versão do mesmo sistema** (sucessor do Firebase), o formato de arquivo é intencionalmente o mesmo (`meta.versaoFormato: "1.0"`), variando apenas `meta.backendOrigem`. Tabela de equivalência de campos para quem for escrever o conversor entre os dois formatos:

| Firebase (`aulas`) | Supabase (`aulas`) |
|---|---|
| `laboratorioSelecionado` | `laboratorio` |
| `dataInicio` (Timestamp) | `data_inicio` (timestamptz) |
| `dataFim` (Timestamp) | `data_fim` (timestamptz) |
| `tipoAtividade` | `tipo_atividade` |
| `isRevisao` | `is_revisao` |
| — | `is_prova` (a versão Firebase não tem flag equivalente; inferir de `tipoAtividade === 'prova'`) |
| `horarioSlotString` | `horario_slot` |
| `cursos` (array) | `cursos` (`TEXT[]`) |
| `proponenteNome` | `proposto_por_nome` |
| `tecnicos` (array) | `tecnicos` (não presente no schema atual — avaliar adicionar coluna `TEXT[]`) |

Ao importar um backup **gerado no Firebase** dentro do Supabase (ou vice-versa), essa tabela deve orientar uma etapa de **mapeamento de campos** antes de aplicar a mesma lógica de chave natural da seção 5.1.

---

## 7. Plano de implementação (passo a passo)

1. Criar `src/utils/backupExport.js` e `src/utils/backupImport.js` conforme seções 4 e 5.
2. Criar página `src/pages/Gerenciar/BackupSistema.jsx`, protegida por `isCoordenador`, com abas **"Exportar"** e **"Importar"** (reaproveitar layout da versão Firebase, já que a UI pode ser idêntica).
3. Adicionar rota no menu do coordenador.
4. Trocar as políticas RLS `FOR ALL USING (true)` por políticas específicas por operação/perfil (seção 2) — hoje qualquer usuário autenticado tem acesso total às tabelas, o que é um risco a corrigir junto com esta feature.
5. Adicionar constraints `UNIQUE` compostas nas tabelas (`aulas`, `eventos_manutencao`, `periodos_sem_atividade`, `grupos`) para permitir, no futuro, evoluir para `upsert`/`ON CONFLICT` via função `plpgsql`.
6. Testar importação de backup do próprio ambiente (deve resultar em "0 novos").
7. Testar importação de um backup **exportado da versão Firebase**, aplicando a tabela de mapeamento da seção 6, validando que os dados migram corretamente sem duplicar.
