import React, { useMemo } from 'react';
import { Box, Paper, Typography, Tooltip, Grid, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { LISTA_LABORATORIOS } from '../constants/laboratorios';
import { BLOCOS_HORARIO } from '../constants/horarios';
import { predictionService } from '../services/predictionService';

export default function HeatmapOcupacao({ aulas = [] }) {
  // Matriz de ocupação: Lab x Bloco de Horário
  const { matrizOcupacao, previsaoDemanda, horariosPico } = useMemo(() => {
    const matriz = {};
    LISTA_LABORATORIOS.forEach(lab => {
      matriz[lab.name] = {};
      BLOCOS_HORARIO.forEach(bloco => {
        matriz[lab.name][bloco.value] = 0;
      });
    });

    aulas.forEach(aula => {
      const labName = aula.laboratorio || aula.laboratorioSelecionado;
      const slot = aula.horario_slot || aula.horarioSlotString;
      if (labName && matriz[labName]) {
        const slots = Array.isArray(slot) ? slot : [slot];
        slots.forEach(s => {
          if (matriz[labName][s] !== undefined) {
            matriz[labName][s] += 1;
          }
        });
      }
    });

    const previsao = predictionService.calcularPrevisaoOcupacao(aulas, LISTA_LABORATORIOS);
    const picos = predictionService.detectarHorariosDePico(aulas);

    return { matrizOcupacao: matriz, previsaoDemanda: previsao, horariosPico: picos };
  }, [aulas]);

  const getColorByIntensity = (count) => {
    if (count === 0) return 'rgba(230, 235, 240, 0.4)';
    if (count === 1) return 'rgba(129, 199, 132, 0.6)';
    if (count === 2) return 'rgba(255, 183, 77, 0.7)';
    return 'rgba(229, 115, 115, 0.85)';
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* Alertas de Previsão de Demanda */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <WarningAmberIcon color="warning" />
          <Typography variant="h6" fontWeight={700}>
            Previsão de Demanda & Risco de Conflitos
          </Typography>
        </Box>
        <Grid container spacing={1.5}>
          {previsaoDemanda.slice(0, 6).map((item, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderColor: item.nivelRisco === 'Crítico' ? 'error.main' : item.nivelRisco === 'Moderado' ? 'warning.main' : 'success.main'
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                    {item.laboratorio}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.totalAgendamentos} aulas ({item.taxaOcupacaoEsperada}% do total)
                  </Typography>
                </Box>
                <Chip
                  label={item.nivelRisco}
                  size="small"
                  color={item.nivelRisco === 'Crítico' ? 'error' : item.nivelRisco === 'Moderado' ? 'warning' : 'success'}
                  variant="filled"
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Grid de Heatmap */}
      <Paper elevation={2} sx={{ p: 2.5, borderRadius: 3, overflowX: 'auto' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Heatmap de Ocupação por Laboratório (Matriz Lab × Horário)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Passe o mouse sobre cada bloco para visualizar o total de aulas alocadas no período.
        </Typography>

        <Box sx={{ minWidth: 700 }}>
          {/* Cabeçalho de Horários */}
          <Box display="flex" mb={1}>
            <Box sx={{ width: 180, fontWeight: 700, pr: 1 }}>Laboratório</Box>
            {BLOCOS_HORARIO.map(bloco => (
              <Box key={bloco.value} sx={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem' }}>
                {bloco.label}
              </Box>
            ))}
          </Box>

          {/* Linhas dos Laboratórios */}
          {LISTA_LABORATORIOS.slice(0, 12).map(lab => (
            <Box key={lab.name} display="flex" alignItems="center" mb={0.8}>
              <Typography variant="body2" fontWeight={500} sx={{ width: 180, pr: 1 }} noWrap title={lab.name}>
                {lab.name}
              </Typography>
              {BLOCOS_HORARIO.map(bloco => {
                const count = matrizOcupacao[lab.name]?.[bloco.value] || 0;
                return (
                  <Tooltip key={bloco.value} title={`${lab.name} — ${bloco.label}: ${count} aula(s)`} arrow placement="top">
                    <Box
                      sx={{
                        flex: 1,
                        height: 34,
                        mx: 0.3,
                        borderRadius: 1,
                        bgcolor: getColorByIntensity(count),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: count > 0 ? '#1a1a1a' : 'text.disabled',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.08)',
                          boxShadow: 2
                        }
                      }}
                    >
                      {count > 0 ? count : ''}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
