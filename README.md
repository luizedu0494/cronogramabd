# CronoLab — Sistema de Gestão de Cronogramas de Laboratórios

> **Plataforma web proprietária, intuitiva e moderna** desenvolvida para simplificar o agendamento de laboratórios acadêmicos em Universidades e Instituições de Ensino Superior (IES). Conecta alunos, professores, técnicos e coordenadores em um só ambiente organizado.

![Banner CronoLab](./imgbanner.png)

<p align="center">
  <a href="#sobre-o-projeto-e-origem">Sobre & Origem</a> •
  <a href="#fluxo-operacional-por-perfil">Fluxo Operacional</a> •
  <a href="#demonstracao-visual-e-gifs">Demonstrações</a> •
  <a href="#recursos-e-funcionalidades">Recursos</a> •
  <a href="#tecnologias-usadas">Tecnologias</a> •
  <a href="#executar-e-configurar-localmente">Executar Localmente</a>
</p>

<p align="center">
  <img alt="Deploy Vercel" src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white"/>
  <img alt="Database Supabase" src="https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white"/>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img alt="MUI v7" src="https://img.shields.io/badge/UI-Material--UI%20v7-1E7EC8?style=for-the-badge&logo=mui&logoColor=white"/>
  <img alt="Status" src="https://img.shields.io/badge/Status-Ativo%20em%20Produ%C3%A7%C3%A3o-brightgreen?style=for-the-badge"/>
  <img alt="Licença" src="https://img.shields.io/badge/Licen%C3%A7a-Propriet%C3%A1ria%20%2F%20Comercial-red?style=for-the-badge"/>
</p>

<p align="center">
  <a href="https://cronogramabd.vercel.app"><strong>🌐 Acesse a Aplicação ao Vivo (Demonstração) →</strong></a>
</p>

---

## <a id="sobre-o-projeto-e-origem"></a><img src="https://api.iconify.design/lucide:microscope.svg?color=%231E7EC8" width="24" height="24" style="vertical-align: sub;" /> Sobre o Projeto & Origem

> [!NOTE]
> **VIVÊNCIA PRÁTICA NO AMBIENTE ACADÊMICO**  
> A ideia do **CronoLab** nasceu diretamente da rotina operacional. Atuando no dia a dia como **Auxiliar de Laboratório no Centro Universitário CESMAC e apoiando ativamente a coordenação**, vivenciei na prática os grandes desafios na gestão dos espaços físicos: trocas de mensagens dispersas, papéis perdidos e o retrabalho constante causado por choque de horários entre disciplinas.

Percebendo essa necessidade real, desenvolvi e apliquei o **CronoLab** diretamente no ambiente de trabalho: um sistema inteligente, transparente e robusto feito sob medida para facilitar o dia a dia dos **meus colegas técnicos**, dar previsibilidade à **coordenação** e garantir acesso rápido para **professores e alunos**.

### <img src="https://api.iconify.design/lucide:check-circle-2.svg?color=%233ECF8E" width="18" height="18" style="vertical-align: sub;" /> Pilares Operacionais

- **Validação Automática contra Conflitos**: Bloqueio em tempo real de qualquer tentativa de agendamento duplicado para a mesma sala e horário.
- **Acessibilidade Multiplataforma**: Experiência fluida no computador de bancada e no smartphone.
- **Comunicação Ativa & Notificações**: Alertas nativos no navegador/área de trabalho assim que uma aula é proposta, aprovada ou ajustada.
- **Integração de Relatórios**: Exportação direta para Excel, PDF e calendários corporativos (Google Agenda, Outlook, Apple Calendar).

---

## <a id="fluxo-operacional-por-perfil"></a><img src="https://api.iconify.design/lucide:users.svg?color=%231E7EC8" width="24" height="24" style="vertical-align: sub;" /> Fluxo Operacional por Perfil

| Perfil | Atribuições no CronoLab |
| :--- | :--- |
| **Alunos e Visitantes** | Consulta pública da grade de aulas de qualquer curso ou laboratório em modo visitante seguro, sem necessidade de login. |
| **Professores e Técnicos** | Agendamento de aulas práticas, envio de solicitações de revisões/provas, gestão de laboratórios favoritos e acompanhamento de bancadas. |
| **Coordenadores** | Central unificada para aprovar/rejeitar solicitações em 1 clique, cadastro de avisos, gestão de manutenções/feriados e relatórios institucionais. |

---

## <a id="demonstracao-visual-e-gifs"></a><img src="https://api.iconify.design/lucide:monitor-play.svg?color=%231E7EC8" width="24" height="24" style="vertical-align: sub;" /> Demonstração Visual & GIFs

---

### <img src="https://api.iconify.design/lucide:monitor.svg?color=%23646CFF" width="18" height="18" style="vertical-align: sub;" /> NAVEGADOR DESKTOP (Computador)

#### 1. Modo Visitante (Acesso Público e Consulta de Aulas)
Visualização sem necessidade de login para consulta de turmas e horários:
![Modo Visitante Desktop](./src/assets/gifs/visitante.gif)

#### 2. Tela Inicial do Técnico
Painel inicial do técnico para acompanhamento rápido dos laboratórios favoritos:
![Inicial do Técnico](./src/assets/gifs/inicial%20do%20tecnico.gif)

#### 3. Propor e Agendar Aulas Práticas
Formulário de proposta com seleção de cursos, laboratórios e horários padronizados:
![Propor Aulas Técnico](./src/assets/gifs/propor%20aulas%20tecnico.gif)
![Agendamento de Aula](./src/assets/gifs/agendamento%20de%20aula.gif)

#### 4. Calendário do Próprio Técnico
Visão dedicada do técnico para controle das suas disciplinas e horários:
![Calendário Próprio do Técnico](./src/assets/gifs/calendario%20proprio%20tecnico.gif)

#### 5. Dashboard do Técnico
Painel operacional para acompanhamento geral das atividades técnicas:
![Dashboard do Técnico](./src/assets/gifs/dashboard%20tecnico.gif)

#### 6. Dashboard e Calendário do Coordenador
Visão executiva do coordenador para gestão completa dos laboratórios:
![Dashboard do Coordenador](./src/assets/gifs/dashboard%20coordenador.gif)
![Calendário do Coordenador](./src/assets/gifs/calendario%20coordenador.gif)

#### 7. Central e Gerenciador de Propostas
Aprovação ou rejeição de agendamentos solicitados pelos professores/técnicos:
![Gerenciador de Propostas](./src/assets/gifs/gerenciador%20de%20propostas.gif)

#### 8. Cadastro de Feriados e Manutenções Preventivas
Bloqueio de laboratórios durante manutenções ou datas festivas:
![Bloqueio de Feriados e Manutenção](./src/assets/gifs/feriados.gif)

#### 9. Relatórios & Download do Cronograma
Exportação personalizada em Excel, PDF e arquivos iCal (.ics):
![Download de Relatórios](./src/assets/gifs/download%20relatorios.gif)

#### 10. Central de Ajuda & FAQ
Base de conhecimento integrada para sanar dúvidas da equipe:
![FAQ e Central de Ajuda](./src/assets/gifs/faq.gif)

#### 11. Cadastro de Usuários & Configurações de Perfil
Gerenciamento do perfil de usuário, foto e preferências de horário silencioso:
![Cadastro de Usuários](./src/assets/gifs/cadastro.gif)
![Configurações de Perfil](./src/assets/gifs/perfil.gif)

---

### <img src="https://api.iconify.design/lucide:smartphone.svg?color=%23646CFF" width="18" height="18" style="vertical-align: sub;" /> NAVEGADOR MOBILE (Dispositivos Móveis / Smartphone)

#### 1. Modo Visitante no Celular
Interface mobile fluida para consulta rápida por alunos e professores:
![Modo Visitante no Celular](./src/assets/gifs/visitante-cel.gif)

#### 2. Painel de Coordenadores e Técnicos no Celular
Gestão ágil de aprovações e agendamentos na palma da mão:
![Coordenador e Técnico no Celular](./src/assets/gifs/coordenadoretecnico-cel.gif)

---

## <a id="recursos-e-funcionalidades"></a><img src="https://api.iconify.design/lucide:layers.svg?color=%231E7EC8" width="22" height="22" style="vertical-align: sub;" /> Recursos e Funcionalidades

- **Calendário Interativo de Ocupação**: Blocos padronizados de horários (Matutino, Vespertino e Noturno).
- **Categorização Visual Distinta**:
  - **Aula Normal**: Identificação em azul institucional.
  - **Revisão / Reforço**: Identificação em roxo.
  - **Prova / Avaliação**: Identificação em vermelho de alto contraste.
- **Modo Visitante Seguro**: Permite consulta de horários sem permissão de edição ou exclusão de dados.
- **Notificações Nativas do Navegador**: Alertas instantâneos no computador e celular imunes a adblockers.
- **Importação & Exportação**:
  - Importação de cronogramas em planilhas Excel (`.xlsx`) e documentos Word (`.docx`).
  - Exportação em **PDF**, **Excel** e arquivos de calendário **iCal (.ics)**.
- **Assistente de Inteligência Artificial**: Análise e diagnóstico inteligente de choques de horário.

---

## <a id="tecnologias-usadas"></a><img src="https://api.iconify.design/lucide:cpu.svg?color=%231E7EC8" width="22" height="22" style="vertical-align: sub;" /> Tecnologias Usadas

- **Frontend**: [React 19](https://react.dev/), [Vite 7](https://vitejs.dev/), [Material-UI (MUI v7)](https://mui.com/), [Dayjs](https://day.js.org/)
- **Backend & Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL + Auth PKCE Flow + Realtime Subscriptions + Storage)
- **Hospedagem & CDN**: [Vercel](https://vercel.com/)
- **Inteligência Artificial**: LangChain.js & Groq API (`llama-3.3-70b-versatile`)
- **Documentos & Dados**: ExcelJS, SheetJS (`xlsx`), jsPDF, Tesseract.js (OCR)

---

## <a id="executar-e-configurar-localmente"></a><img src="https://api.iconify.design/lucide:terminal.svg?color=%231E7EC8" width="22" height="22" style="vertical-align: sub;" /> Executar e Configurar Localmente

Passos para executar o projeto em ambiente de desenvolvimento local ou homologação:

### 1. Clonar o Repositório
```bash
git clone https://github.com/luizedu0494/cronogramabd.git
cd cronogramabd
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://seu_projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
VITE_GROQ_API_KEY=sua_chave_groq_opcional
```

### 4. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
O projeto estará disponível no endereço `http://localhost:5173`.

---

## <a id="licenca-e-direitos-comerciais"></a><img src="https://api.iconify.design/lucide:shield-check.svg?color=%231E7EC8" width="22" height="22" style="vertical-align: sub;" /> Licença e Direitos Comerciais

> [!IMPORTANT]
> **PRODUTO COMERCIAL PROPRIETÁRIO**  
> Este software é um produto **Proprietário e Comercial**. Todos os direitos reservados ao desenvolvedor.  
> Proibida a reprodução, cópia, distribuição ou comercialização não autorizada do código-fonte ou de suas partes. Para licenciamento corporativo ou aquisição de direitos de uso para instituições de ensino, entre em contato.
