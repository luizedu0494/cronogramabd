import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GetAppIcon from '@mui/icons-material/GetApp';
import { isNativeApp } from '../utils/platformHelper';

export const SmartAppBanner: React.FC = () => {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    // Se já estiver rodando dentro do App Nativo (Capacitor), não exibe o banner
    if (isNativeApp()) {
      setVisivel(false);
      return;
    }

    const dispensado = localStorage.getItem('cronolab_smart_banner_dismissed');
    // Exibe apenas em telas pequenas (celular/tablet) no navegador se não tiver sido dispensado
    const isMobileBrowser = window.innerWidth <= 768;
    if (isMobileBrowser && !dispensado) {
      setVisivel(true);
    }
  }, []);

  const handleDispensar = () => {
    setVisivel(false);
    localStorage.setItem('cronolab_smart_banner_dismissed', 'true');
  };

  const handleAbrirApp = () => {
    // Link direto de download ou deep link
    window.location.href = '/download-cronograma';
  };

  if (!visivel) return null;

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1400,
        bgcolor: '#1E7EC8',
        color: '#ffffff',
        borderRadius: 0,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5} flexGrow={1}>
        <IconButton size="small" onClick={handleDispensar} sx={{ color: '#ffffff', p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
            App CronoLab
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
            Melhor experiência com notificações nativas no seu celular
          </Typography>
        </Box>
      </Box>
      <Button
        variant="contained"
        size="small"
        startIcon={<GetAppIcon />}
        onClick={handleAbrirApp}
        sx={{
          bgcolor: '#ffffff',
          color: '#1E7EC8',
          fontWeight: 700,
          textTransform: 'none',
          ml: 1,
          borderRadius: 2,
          '&:hover': { bgcolor: '#f1f5f9' }
        }}
      >
        Instalar
      </Button>
    </Paper>
  );
};

export default SmartAppBanner;
