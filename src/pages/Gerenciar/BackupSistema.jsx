import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Stack,
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { gerarBackupCompleto } from '../../utils/backupExport';
import { analisarBackupParaImportacao, importarSomenteNovos } from '../../utils/backupImport';

export default function BackupSistema({ userProfile }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);

  const [exportMessage, setExportMessage] = useState(null);
  const [exportResumo, setExportResumo] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [relatorioAnalise, setRelatorioAnalise] = useState(null);
  const [importMessage, setImportMessage] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const isCoordenador = userProfile?.role === 'coordenador';

  if (!isCoordenador) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 6 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" color="error" gutterBottom fontWeight="bold">
            Acesso Negado
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Apenas coordenadores possuem permissão para gerar ou restaurar backups do sistema.
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setRelatorioAnalise(null);
      setImportMessage(null);
      setImportSuccess(false);
    }
  };

  const handleAnalisarArquivo = async () => {
    if (!selectedFile) return;
    setLoadingImport(true);
    setImportMessage(null);

    try {
      const text = await selectedFile.text();
      const backupJson = JSON.parse(text);
      const relatorio = await analisarBackupParaImportacao(backupJson);
      setRelatorioAnalise(relatorio);
    } catch (err) {
      setImportMessage({ type: 'error', text: `Erro ao ler arquivo de backup: ${err.message}` });
    } finally {
      setLoadingImport(false);
    }
  };

  const handleConfirmarImportacao = async () => {
    if (!relatorioAnalise) return;
    setLoadingImport(true);
    setImportMessage(null);

    try {
      await importarSomenteNovos(relatorioAnalise, userProfile);
      setImportSuccess(true);
      setImportMessage({
        type: 'success',
        text: 'Importação concluída com sucesso! Os novos registros foram incluídos.',
      });
    } catch (err) {
      setImportMessage({ type: 'error', text: `Erro durante a importação: ${err.message}` });
    } finally {
      setLoadingImport(false);
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
                Backup & Restauração do Sistema
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Exportação e importação de dados operacionais do CronoLab (exclusivo para Coordenador)
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} variant="fullWidth">
            <Tab icon={<DownloadIcon />} iconPosition="start" label="Exportar Backup" />
            <Tab icon={<UploadIcon />} iconPosition="start" label="Restaurar / Importar" />
          </Tabs>
        </Box>

        {/* ABA EXPORTAR */}
        {tabIndex === 0 && (
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
        )}

        {/* ABA IMPORTAR */}
        {tabIndex === 1 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom fontWeight="medium">
              Importar Backup de Dados
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Selecione um arquivo de backup (.json) prévio do CronoLab. O sistema fará a análise inteligente para
              incluir <strong>somente os registros novos</strong>, prevenindo duplicidades.
            </Typography>

            {importMessage && (
              <Alert severity={importMessage.type} sx={{ mb: 3 }}>
                {importMessage.text}
              </Alert>
            )}

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Button variant="outlined" component="label">
                Selecionar Arquivo JSON
                <input type="file" accept=".json" hidden onChange={handleFileChange} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {selectedFile ? selectedFile.name : 'Nenhum arquivo selecionado'}
              </Typography>
            </Stack>

            {selectedFile && !relatorioAnalise && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={loadingImport ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                onClick={handleAnalisarArquivo}
                disabled={loadingImport}
                sx={{ mb: 3 }}
              >
                {loadingImport ? 'Analisando...' : 'Analisar Conteúdo do Backup'}
              </Button>
            )}

            {/* TABELA DE PRÉVIA */}
            {relatorioAnalise && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Prévia da Importação:
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell>Tabela / Coleção</TableCell>
                        <TableCell align="center">Total no Arquivo</TableCell>
                        <TableCell align="center">Já Existentes (Ignorados)</TableCell>
                        <TableCell align="center">Novos (A Importar)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(relatorioAnalise).map(([tabela, data]) => (
                        <TableRow key={tabela}>
                          <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                            {tabela}
                          </TableCell>
                          <TableCell align="center">{data.totalNoBackup}</TableCell>
                          <TableCell align="center">
                            <Chip label={data.jaExistem.length} size="small" color="default" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={data.novos.length}
                              size="small"
                              color={data.novos.length > 0 ? 'success' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {!importSuccess && (
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={loadingImport ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
                      onClick={handleConfirmarImportacao}
                      disabled={
                        loadingImport ||
                        Object.values(relatorioAnalise).every((data) => data.novos.length === 0)
                      }
                    >
                      {loadingImport ? 'Importando...' : 'Confirmar Importação de Registros Novos'}
                    </Button>
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
}
