import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { gerarBackupCompleto } from '../../utils/backupExport';

export default function BackupSistema({ userProfile }) {
  const [loadingExport, setLoadingExport] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const [exportResumo, setExportResumo] = useState(null);

  const isCoordenador = userProfile?.role === 'coordenador';

  if (!isCoordenador) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 6 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" color="error" gutterBottom fontWeight="bold">
            Acesso Negado
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Apenas coordenadores possuem permissão para gerar backups do sistema.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const handleGerarBackup = async () => {
    setLoadingExport(true);
    setExportMessage(null);
    setExportResumo(null);
    try {
      const backup = await gerarBackupCompleto(userProfile);
      const resumo = Object.entries(backup.colecoes).map(([tabela, itens]) => ({
        tabela,
        total: itens.length,
      }));
      setExportResumo(resumo);
      setExportMessage({ type: 'success', text: 'Backup gerado e baixado com sucesso!' });
    } catch (err) {
      setExportMessage({ type: 'error', text: `Erro ao gerar backup: ${err.message}` });
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <StorageIcon fontSize="large" />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Backup do Sistema
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Exportação de dados operacionais do CronoLab (exclusivo para Coordenador)
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom fontWeight="medium">
            Gerar Arquivo de Backup Completo
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Esta ação cria um arquivo JSON contendo todas as aulas, eventos de manutenção, períodos sem atividade,
            grupos de estudo e avisos cadastrados no sistema.
          </Typography>

          {exportMessage && (
            <Alert severity={exportMessage.type} sx={{ mb: 3 }}>
              {exportMessage.text}
            </Alert>
          )}

          {exportResumo && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Resumo do Backup Gerado:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {exportResumo.map((item) => (
                  <Chip
                    key={item.tabela}
                    label={`${item.tabela}: ${item.total} registro(s)`}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Paper>
          )}

          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={loadingExport ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleGerarBackup}
            disabled={loadingExport}
          >
            {loadingExport ? 'Gerando Backup...' : 'Baixar Backup Completo (.json)'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
