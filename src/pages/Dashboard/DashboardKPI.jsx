import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Paper, Typography, Box, Card, CardContent,
  CircularProgress, Chip, Button, Divider, List, ListItem, ListItemText, Avatar
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PendingActionsIcon from '@mui/icons-material/HourglassEmpty';
import ScienceIcon from '@mui/icons-material/Science';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { supabase } from '../../supabaseConfig';
import { useNavigate } from 'react-router-dom';

dayjs.locale('pt-br');

export default function DashboardKPI({ userInfo }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    aulasMes: 0,
    pendentes: 0,
    topLabs: [],
    proximasAulas: [],
    eventosAtivos: 0
  });

  useEffect(() => {
    async function carregarDashboardData() {
      setLoading(true);
      try {
        const inicioMes = dayjs().startOf('month').toISOString();
        const fimMes = dayjs().endOf('month').toISOString();
        const inicioHoje = dayjs().startOf('day').toISOString();
        const fimHoje = dayjs().endOf('day').toISOString();

        // 1. Aulas do Mês
        const { count: aulasMesCount } = await supabase
          .from('aulas')
          .select('*', { count: 'exact', head: true })
          .gte('data_inicio', inicioMes)
          .lte('data_inicio', fimMes)
          .eq('status', 'aprovada');

        // 2. Pendentes
        const { count: pendentesCount } = await supabase
          .from('aulas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pendente');

        // 3. Próximas Aulas de Hoje
        const { data: hojeAulas } = await supabase
          .from('aulas')
          .select('*')
          .gte('data_inicio', inicioHoje)
          .lte('data_inicio', fimHoje)
          .order('data_inicio', { ascending: true })
          .limit(5);

        // 4. Agrupamento por Laboratório no Mês
        const { data: todasAulasMes } = await supabase
          .from('aulas')
          .select('laboratorio')
          .gte('data_inicio', inicioMes)
          .lte('data_inicio', fimMes);

        const labCounts = {};
        (todasAulasMes || []).forEach(a => {
          const l = a.laboratorio || 'Não especificado';
          labCounts[l] = (labCounts[l] || 0) + 1;
        });

        const topLabsSorted = Object.entries(labCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setStats({
          aulasMes: aulasMesCount || 0,
          pendentes: pendentesCount || 0,
          topLabs: topLabsSorted,
          proximasAulas: hojeAulas || [],
          eventosAtivos: 0
        });
      } catch (err) {
        console.error('Erro ao carregar KPIs do Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    carregarDashboardData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const isCoordenador = userInfo?.role === 'coordenador';

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} color="primary.main" gutterBottom>
          Painel Geral & Resumo de Indicadores
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visão em tempo real das atividades, ocupação dos laboratórios e pendências no CronoLab.
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3, borderLeft: '5px solid #1E7EC8' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  AULAS APROVADAS (MÊS)
                </Typography>
                <Typography variant="h3" fontWeight={700} sx={{ my: 0.5 }}>
                  {stats.aulasMes}
                </Typography>
                <Typography variant="caption" color="success.main" display="flex" alignItems="center" gap={0.5}>
                  <TrendingUpIcon fontSize="small" /> Mês atual em andamento
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.light', width: 56, height: 56 }}>
                <EventAvailableIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3, borderLeft: '5px solid #F5C518' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  PROPOSTAS PENDENTES
                </Typography>
                <Typography variant="h3" fontWeight={700} sx={{ my: 0.5 }}>
                  {stats.pendentes}
                </Typography>
                <Typography variant="caption" color="warning.main">
                  {isCoordenador ? 'Aguardando sua revisão' : 'Aguardando coordenação'}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#FFF8E1', width: 56, height: 56 }}>
                <PendingActionsIcon sx={{ color: '#D4940A', fontSize: 32 }} />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3, borderLeft: '5px solid #00C853' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  HOJE
                </Typography>
                <Typography variant="h3" fontWeight={700} sx={{ my: 0.5 }}>
                  {stats.proximasAulas.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Aulas agendadas para hoje
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#E8F5E9', width: 56, height: 56 }}>
                <ScienceIcon sx={{ color: '#00C853', fontSize: 32 }} />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3, borderLeft: '5px solid #9C27B0' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  LAB MAIS UTILIZADO
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ my: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stats.topLabs[0]?.name || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.topLabs[0]?.count || 0} agendamentos no mês
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#F3E5F5', width: 56, height: 56 }}>
                <PeopleIcon sx={{ color: '#9C27B0', fontSize: 32 }} />
              </Avatar>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Grid Principal */}
      <Grid container spacing={3}>
        {/* Próximas Aulas de Hoje */}
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, minHeight: 360 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb= {2}>
              <Typography variant="h6" fontWeight={700}>
                Aulas de Hoje ({dayjs().format('DD/MM/YYYY')})
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/calendario')}>
                Ver Calendário
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {stats.proximasAulas.length === 0 ? (
              <Box py={6} textAlign="center">
                <Typography variant="body1" color="text.secondary">
                  Nenhuma aula agendada para o dia de hoje.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {stats.proximasAulas.map((aula, idx) => (
                  <React.Fragment key={aula.id || idx}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <Box display="flex" flexDirection="column" width="100%">
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {aula.assunto || 'Sem título'}
                          </Typography>
                          <Chip
                            label={aula.horario_slot || '07:00-09:10'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        <Box display="flex" gap={2} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Lab: <strong>{aula.laboratorio}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Solicitante: <strong>{aula.proposto_por_nome || 'N/A'}</strong>
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                    {idx < stats.proximasAulas.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Top Laboratórios */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3, minHeight: 360 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Laboratórios Mais Solicitados
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {stats.topLabs.length === 0 ? (
              <Box py={6} textAlign="center">
                <Typography variant="body1" color="text.secondary">
                  Sem dados de agendamento neste mês.
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2.5}>
                {stats.topLabs.map((lab, index) => (
                  <Box key={lab.name}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {index + 1}. {lab.name}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {lab.count} aulas
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                      <Box
                        sx={{
                          width: `${Math.min(100, (lab.count / (stats.topLabs[0]?.count || 1)) * 100)}%`,
                          bgcolor: index === 0 ? '#1E7EC8' : index === 1 ? '#00C853' : '#F5C518',
                          height: '100%',
                          borderRadius: 1
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
