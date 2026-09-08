// src/AjudaFAQ.jsx
import React from 'react';
import {
  Container, Typography, Paper, Accordion, AccordionSummary,
  AccordionDetails, Box, Chip, Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Categorias para organizar as perguntas
const CATEGORIAS = {
  visitante:   { label: 'Visitante (Alunos e Professores)', color: 'primary' },
  geral:       { label: 'Geral',            color: 'default' },
  calendario:  { label: 'Calendário',       color: 'success' },
  tecnico:     { label: 'Técnico',          color: 'info'    },
  coordenador: { label: 'Coordenador',      color: 'primary' },
  avisos:      { label: 'Avisos',           color: 'warning' },
  download:    { label: 'Download',         color: 'secondary'},
};

const faqData = [

  // ── VISITANTE (ALUNOS E PROFESSORES) ───────────────────────────────────

  {
    id: 'faq-visitante-acesso',
    categoria: 'visitante',
    pergunta: 'Preciso de cadastro ou aprovação para ver o cronograma?',
    resposta: 'Não! Alunos e professores podem acessar o sistema diretamente pelo botão "Visualizar Calendário (Acesso Público)" na tela inicial. Não é necessário criar conta nem aguardar aprovação.',
  },
  {
    id: 'faq-visitante-calendario',
    categoria: 'visitante',
    pergunta: 'Como consulto as aulas e laboratórios do meu curso?',
    resposta: 'Acesse a página "Calendário". Você pode usar os filtros no topo da tela para selecionar o tipo de laboratório ou pesquisar pelo nome da sua disciplina/assunto para encontrar os horários exatos.',
  },
  {
    id: 'faq-visitante-download',
    categoria: 'visitante',
    pergunta: 'Como faço para exportar ou baixar o cronograma de aulas?',
    resposta: 'No menu "Baixar Cronograma", você pode exportar a lista das aulas em planilha Excel (.xlsx), arquivo de calendário (.ics para Google Calendar/Outlook) ou relatórios em PDF.',
  },
  {
    id: 'faq-visitante-cores',
    categoria: 'visitante',
    pergunta: 'O que significam as cores e legendas no calendário?',
    resposta: 'As aulas possuem indicações de status e tipo:\n\n• Verde: Aula ou Evento Aprovado e confirmado\n• Amarelo/Laranja: Aguardando Aprovação\n• Vermelho: Prova ou Avaliação\n• Roxo: Revisão ou Monitoria',
  },

  // ── GERAL ───────────────────────────────────────────────────────────────

  {
    id: 'faq-login',
    categoria: 'geral',
    pergunta: 'Como faço para acessar o sistema como Equipe?',
    resposta: 'Técnicos e Coordenadores devem solicitar cadastro informando e-mail corporativo ou entrar com a conta Google corporativa. O perfil passará por aprovação da coordenação.',
  },
  {
    id: 'faq-trocar-tema',
    categoria: 'geral',
    pergunta: 'Posso mudar a aparência do sistema (tema claro/escuro)?',
    resposta: 'Sim! No canto superior direito da tela, clique no ícone de sol (tema claro) ou de lua (tema escuro) para alternar. A preferência fica salva no seu navegador.',
  },
  {
    id: 'faq-sair',
    categoria: 'geral',
    pergunta: 'Como faço para sair do modo visitante?',
    resposta: 'Clique no botão "Sair" ou "Sair do Modo Visitante" no topo da página ou no menu principal.',
  },

  // ── TÉCNICO ─────────────────────────────────────────────────────────────

  {
    id: 'faq-tecnico-onboarding',
    categoria: 'tecnico',
    pergunta: 'Na primeira vez que abri o sistema, apareceu uma tela de configuração. O que é isso?',
    resposta: 'É o onboarding de boas-vindas para técnicos monitorarem seus laboratórios de preferência no painel.',
  },
  {
    id: 'faq-tecnico-filtro-labs',
    categoria: 'tecnico',
    pergunta: 'Como filtro o cronograma para mostrar só os meus laboratórios?',
    resposta: 'No painel inicial, dentro do card "Cronograma Oficial — Hoje", clique no ícone de funil no canto superior direito.',
  },
  {
    id: 'faq-tecnico-propor-aula',
    categoria: 'tecnico',
    pergunta: 'Como proponho uma nova aula?',
    resposta: 'Acesse "Propor Aula" no menu. Preencha a disciplina, laboratório, data e bloco de horário e envie para aprovação.',
  },

  // ── COORDENADOR ─────────────────────────────────────────────────────────

  {
    id: 'faq-coord-aprovar',
    categoria: 'coordenador',
    pergunta: 'Como aprovo ou rejeito propostas de aula?',
    resposta: 'Acesse "Aprovações" no menu da coordenação para aprovar, rejeitar ou atribuir técnicos.',
  },
  {
    id: 'faq-coord-usuarios',
    categoria: 'coordenador',
    pergunta: 'Como aprovo novos usuários e altero cargos?',
    resposta: 'Acesse "Usuários" no menu do coordenador para gerenciar aprovações de conta e perfis.',
  },

  // ── CALENDÁRIO ───────────────────────────────────────────────────────────

  {
    id: 'faq-ver-cronograma',
    categoria: 'calendario',
    pergunta: 'Como visualizo o cronograma de aulas?',
    resposta: 'Acesse "Calendário" no menu. O cronograma é exibido em formato semanal. Use as setas para navegar entre semanas ou selecione uma data específica.',
  },
  {
    id: 'faq-blocos-horario',
    categoria: 'calendario',
    pergunta: 'O que são os blocos de horário fixos?',
    resposta: 'O sistema usa blocos de horário padronizados:\n\n• 07:00 – 09:10\n• 09:30 – 12:00\n• 13:00 – 15:10\n• 15:30 – 18:00\n• 18:30 – 20:10\n• 20:30 – 22:00',
  },

];

// ── Componente ───────────────────────────────────────────────────────────────

function AjudaFAQ({ userInfo }) {
  const [expanded, setExpanded] = React.useState(false);
  const isVisitor = userInfo?.role === 'visualizador';
  const [categoriaAtiva, setCategoriaAtiva] = React.useState(isVisitor ? 'visitante' : 'todas');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const categoriasDisponiveis = isVisitor
    ? { visitante: CATEGORIAS.visitante, calendario: CATEGORIAS.calendario, geral: CATEGORIAS.geral }
    : CATEGORIAS;

  const faqBase = isVisitor 
    ? faqData.filter(f => ['visitante', 'calendario', 'geral'].includes(f.categoria))
    : faqData;

  const faqFiltrado = categoriaAtiva === 'todas'
    ? faqBase
    : faqBase.filter(f => f.categoria === categoriaAtiva);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 1, fontWeight: 700 }}>
          {isVisitor ? 'Dúvidas & Dicas para Visitantes' : 'Ajuda / Perguntas Frequentes'}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          {isVisitor ? 'Guia prático para consultar horários e usar o assistente de I.A.' : `${faqBase.length} perguntas — filtre por categoria para encontrar mais rápido`}
        </Typography>

        {/* Filtro por categoria */}
        <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" sx={{ mb: 3 }}>
          <Chip
            label="Todas"
            onClick={() => { setCategoriaAtiva('todas'); setExpanded(false); }}
            color={categoriaAtiva === 'todas' ? 'primary' : 'default'}
            variant={categoriaAtiva === 'todas' ? 'filled' : 'outlined'}
          />
          {Object.entries(CATEGORIAS).map(([key, cat]) => (
            <Chip
              key={key}
              label={cat.label}
              onClick={() => { setCategoriaAtiva(key); setExpanded(false); }}
              color={categoriaAtiva === key ? cat.color : 'default'}
              variant={categoriaAtiva === key ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>

        {faqFiltrado.length === 0 ? (
          <Typography variant="body1" align="center" color="text.secondary">
            Nenhuma pergunta nesta categoria.
          </Typography>
        ) : (
          <Box>
            {faqFiltrado.map((item) => (
              <Accordion
                key={item.id}
                expanded={expanded === item.id}
                onChange={handleChange(item.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`${item.id}-content`}
                  id={`${item.id}-header`}
                >
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Chip
                      label={CATEGORIAS[item.categoria]?.label}
                      color={CATEGORIAS[item.categoria]?.color}
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                    <Typography variant="body1" fontWeight={500}>
                      {item.pergunta}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                    {item.resposta}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default AjudaFAQ;
