// src/PainelAvisos.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseConfig';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Card, CardContent, Divider, IconButton,
  Collapse, Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ReportIcon from '@mui/icons-material/Report';

import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('pt-br');
dayjs.extend(relativeTime);

const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const avisoMeta = {
  normal: { icon: <InfoIcon />, color: 'primary' },
  importante: { icon: <WarningIcon />, color: 'warning' },
  urgente: { icon: <ReportIcon />, color: 'error' },
};

function PainelAvisos() {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avisosState, setAvisosState] = useState({});

  const handleToggleExpand = (avisoId) => {
    setAvisosState(prev => ({
      ...prev,
      [avisoId]: { ...prev[avisoId], expanded: !prev[avisoId]?.expanded },
    }));
  };

  useEffect(() => {
    async function carregarAvisos() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('avisos')
          .select('*');

        if (!err && data) {
          const formatados = data.map(d => ({
            id: d.id,
            titulo: d.titulo || d.title,
            mensagem: d.mensagem || d.message || d.conteudo,
            prioridade: d.prioridade || d.nivel || 'normal',
            autor: d.autor || d.criado_por || 'Coordenação',
            dataCriacao: d.data_criacao || d.criado_em || d.created_at ? dayjs(d.data_criacao || d.criado_em || d.created_at) : dayjs()
          }));
          formatados.sort((a, b) => b.dataCriacao.valueOf() - a.dataCriacao.valueOf());
          setAvisos(formatados);
        } else {
          if (err) setError('Falha ao carregar avisos. Tente novamente mais tarde.');
          setAvisos([]);
        }
      } catch (e) {
        setError('Erro de conexão ao carregar avisos.');
        setAvisos([]);
      } finally {
        setLoading(false);
      }
    }
    carregarAvisos();
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <span role="img" aria-hidden="true">📢</span> Painel de Avisos
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {avisos.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum aviso cadastrado no momento.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {avisos.map(aviso => {
            const meta = avisoMeta[aviso.prioridade] || avisoMeta.normal;
            const isExpanded = !!avisosState[aviso.id]?.expanded;

            return (
              <motion.div key={aviso.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card 
                  elevation={2}
                  sx={{
                    borderRadius: 3,
                    borderLeft: '5px solid',
                    borderLeftColor: `${meta.color}.main`,
                    bgcolor: 'background.paper'
                  }}
                >
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip 
                            icon={meta.icon} 
                            label={(aviso.prioridade || 'normal').toUpperCase()} 
                            color={meta.color} 
                            size="small" 
                            sx={{ fontWeight: 700, fontSize: '0.68rem', borderRadius: '6px' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {aviso.dataCriacao ? dayjs(aviso.dataCriacao).fromNow() : ''}
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700} color="text.primary">
                          {aviso.titulo}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Por: {aviso.autor}
                        </Typography>
                      </Box>
                      <ExpandMore
                        expand={isExpanded}
                        onClick={() => handleToggleExpand(aviso.id)}
                        aria-expanded={isExpanded}
                        aria-label="mostrar mais"
                      >
                        <ExpandMoreIcon />
                      </ExpandMore>
                    </Box>

                    <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ mt: 2 }}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {aviso.mensagem}
                      </Typography>
                    </Collapse>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </Box>
      )}
    </Container>
  );
}

export default PainelAvisos;
