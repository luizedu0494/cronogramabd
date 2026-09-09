import React from 'react';
import { Box, Typography, LinearProgress, Alert, CircularProgress } from '@mui/material';
import { useUsageCounter } from '../utils/useUsageCounter';

const UsageMonitor: React.FC = () => {
  const { usageCount, DAILY_READ_LIMIT, usagePercentage, isCritical, isLoading } =
    useUsageCounter();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
        <CircularProgress size={20} sx={{ mr: 1 }} />
        <Typography variant="body2">Carregando monitor de uso...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mt: 3, bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom>
        Monitor de Uso de Consultas
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Consultas Críticas Registradas: <strong>{usageCount.toLocaleString()}</strong> de{' '}
        <strong>{DAILY_READ_LIMIT.toLocaleString()}</strong> (Limite Diário de Consultas)
      </Typography>

      <LinearProgress
        variant="determinate"
        value={usagePercentage}
        color={isCritical ? 'error' : 'primary'}
        sx={{ height: 10, borderRadius: 5, my: 1 }}
      />

      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
        {usagePercentage.toFixed(2)}% de uso
      </Typography>

      {isCritical && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Atenção: O limite de consultas diárias está acima de 80%. Considere otimizar as operações.
        </Alert>
      )}

      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
        *Este contador rastreia as consultas críticas de alta frequência do sistema.
      </Typography>
    </Box>
  );
};

export default UsageMonitor;
