import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Paper, Typography, Box, CircularProgress, Alert, Button,
    TextField, Grid, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TablePagination, FormControl, InputLabel, Select,
    MenuItem, Card, CardContent, CardHeader, useTheme, useMediaQuery
} from '@mui/material';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from './supabaseConfig';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Search, Filter, X, CheckCircle, XCircle, Clock } from 'lucide-react';

const ListagemCompletaAulas = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Estados de dados
    const [aulas, setAulas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [usuarios, setUsuarios] = useState([]);

    // Estados de filtro
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroAutor, setFiltroAutor] = useState('');
    const [filtroDataInicio, setFiltroDataInicio] = useState(null);
    const [filtroDataFim, setFiltroDataFim] = useState(null);
    const [filtroTipo, setFiltroTipo] = useState(''); // 'dia', 'mes', 'ano', 'intervalo', ''
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de paginação
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Buscar usuários para o filtro de autor
    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const { data } = await supabase.from('users').select('uid, name');
                setUsuarios((data || []).map(u => ({ uid: u.uid, nome: u.name || 'Usuário' })));
            } catch (err) {
                console.error("Erro ao buscar usuários:", err);
            }
        };
        fetchUsuarios();
    }, []);

    // Função para construir o filtro de data
    const construirFiltroData = useCallback(() => {
        if (!filtroDataInicio) return null;
        const dObj = dayjs(filtroDataInicio.toDate ? filtroDataInicio.toDate() : filtroDataInicio);
        if (filtroTipo === 'dia') {
            return { inicio: dObj.startOf('day').toISOString(), fim: dObj.endOf('day').toISOString() };
        } else if (filtroTipo === 'mes') {
            return { inicio: dObj.startOf('month').toISOString(), fim: dObj.endOf('month').toISOString() };
        } else if (filtroTipo === 'ano') {
            return { inicio: dObj.startOf('year').toISOString(), fim: dObj.endOf('year').toISOString() };
        } else if (filtroTipo === 'intervalo' && filtroDataFim) {
            const dFimObj = dayjs(filtroDataFim.toDate ? filtroDataFim.toDate() : filtroDataFim);
            return { inicio: dObj.startOf('day').toISOString(), fim: dFimObj.endOf('day').toISOString() };
        }
        return null;
    }, [filtroTipo, filtroDataInicio, filtroDataFim]);

    // Função para buscar aulas com filtros
    const fetchAulas = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let queryBuilder = supabase.from('aulas').select('*').order('created_at', { ascending: false });

            if (filtroStatus) {
                queryBuilder = queryBuilder.eq('status', filtroStatus);
            }

            if (filtroAutor) {
                queryBuilder = queryBuilder.eq('proposto_por_uid', filtroAutor);
            }

            const filtroData = construirFiltroData();
            if (filtroData) {
                queryBuilder = queryBuilder.gte('data_inicio', filtroData.inicio).lte('data_inicio', filtroData.fim);
            }

            const { data, error: err } = await queryBuilder;
            if (err) throw err;

            const fetched = (data || []).map(d => ({
                id: d.id,
                ...d,
                title: d.assunto,
                dataInicio: d.data_inicio ? new Date(d.data_inicio) : null,
                dataFim: d.data_fim ? new Date(d.data_fim) : null,
                laboratorioSelecionado: d.laboratorio,
                propostaPorNome: d.proposto_por_nome,
            }));
            setAulas(fetched);
        } catch (err) {
            console.error("Erro ao buscar aulas:", err);
            setError("Não foi possível carregar as aulas.");
        } finally {
            setLoading(false);
        }
    }, [filtroStatus, filtroAutor, construirFiltroData]);

    // Executar busca quando filtros mudam
    useEffect(() => {
        fetchAulas();
    }, [fetchAulas]);

    // Funções de manipulação de paginação
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Função para limpar filtros
    const limparFiltros = () => {
        setFiltroStatus('');
        setFiltroAutor('');
        setFiltroDataInicio(null);
        setFiltroDataFim(null);
        setFiltroTipo('');
        setSearchTerm('');
        setPage(0);
    };

    // Função para obter a cor do status
    const getStatusColor = (status) => {
        switch (status) {
            case 'aprovada':
                return '#4caf50';
            case 'reprovada':
                return '#f44336';
            case 'pendente':
                return '#ff9800';
            default:
                return '#9e9e9e';
        }
    };

    // Função para obter o ícone do status
    const getStatusIcon = (status) => {
        switch (status) {
            case 'aprovada':
                return <CheckCircle size={16} />;
            case 'reprovada':
                return <XCircle size={16} />;
            case 'pendente':
                return <Clock size={16} />;
            default:
                return null;
        }
    };

    // Função para formatar a data
    const formatarData = (data) => {
        if (!data) return 'Data não disponível';
        try {
            const dataObj = typeof data === 'string' ? new Date(data) : data.toDate?.() || data;
            return format(dataObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
        } catch {
            return 'Data inválida';
        }
    };

    // Dados para exibição na tabela
    const displayedAulas = aulas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Cabeçalho */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                    Listagem Completa de Aulas
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Visualize e filtre todas as aulas adicionadas ao sistema
                </Typography>
            </Box>

            {/* Card de Filtros */}
            <Card sx={{ mb: 4, boxShadow: 2 }}>
                <CardHeader
                    avatar={<Filter size={24} style={{ color: theme.palette.primary.main }} />}
                    title="Filtros de Busca"
                    titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                />
                <CardContent>
                    <Grid container spacing={2}>
                        {/* Busca por Título/Laboratório */}
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Buscar por Título ou Laboratório"
                                variant="outlined"
                                size="small"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(0);
                                }}
                                InputProps={{
                                    startAdornment: <Search size={18} style={{ marginRight: 8 }} />
                                }}
                            />
                        </Grid>

                        {/* Filtro por Status */}
                        <Grid item xs={12} sm={6} md={4} sx={{ width: '100%' }}>
                            <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: 130 } }} size="small">
                                <InputLabel shrink notched>Status</InputLabel>
                                <Select
                                    value={filtroStatus}
                                    onChange={(e) => {
                                        setFiltroStatus(e.target.value);
                                        setPage(0);
                                    }}
                                    input={<OutlinedInput notched label="Status" />}
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="aprovada">Aprovada</MenuItem>
                                    <MenuItem value="reprovada">Reprovada</MenuItem>
                                    <MenuItem value="pendente">Pendente</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Filtro por Autor */}
                        <Grid item xs={12} sm={6} md={4} sx={{ width: '100%' }}>
                            <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: 140 } }} size="small">
                                <InputLabel shrink notched>Autor</InputLabel>
                                <Select
                                    value={filtroAutor}
                                    onChange={(e) => {
                                        setFiltroAutor(e.target.value);
                                        setPage(0);
                                    }}
                                    input={<OutlinedInput notched label="Autor" />}
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    {usuarios.map(usuario => (
                                        <MenuItem key={usuario.uid} value={usuario.uid}>
                                            {usuario.nome}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Tipo de Filtro de Data */}
                        <Grid item xs={12} sm={6} md={4} sx={{ width: '100%' }}>
                            <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: 140 } }} size="small">
                                <InputLabel shrink notched>Filtro de Data</InputLabel>
                                <Select
                                    value={filtroTipo}
                                    onChange={(e) => {
                                        setFiltroTipo(e.target.value);
                                        setPage(0);
                                    }}
                                    input={<OutlinedInput notched label="Filtro de Data" />}
                                >
                                    <MenuItem value="">Nenhum</MenuItem>
                                    <MenuItem value="dia">Por Dia</MenuItem>
                                    <MenuItem value="mes">Por Mês</MenuItem>
                                    <MenuItem value="ano">Por Ano</MenuItem>
                                    <MenuItem value="intervalo">Por Intervalo</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Data Início (conforme tipo de filtro) */}
                        {filtroTipo && (
                            <Grid item xs={12} sm={6} md={4}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                                    <DatePicker
                                        label={filtroTipo === 'intervalo' ? 'Data Início' : 'Data'}
                                        value={filtroDataInicio}
                                        onChange={(newValue) => {
                                            setFiltroDataInicio(newValue);
                                            setPage(0);
                                        }}
                                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        )}

                        {/* Data Fim (apenas para intervalo) */}
                        {filtroTipo === 'intervalo' && (
                            <Grid item xs={12} sm={6} md={4}>
                                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                                    <DatePicker
                                        label="Data Fim"
                                        value={filtroDataFim}
                                        onChange={(newValue) => {
                                            setFiltroDataFim(newValue);
                                            setPage(0);
                                        }}
                                        slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        )}

                        {/* Botão Limpar Filtros */}
                        <Grid item xs={12}>
                            <Button
                                variant="outlined"
                                startIcon={<X size={18} />}
                                onClick={limparFiltros}
                                sx={{ mt: 1 }}
                            >
                                Limpar Filtros
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Indicador de Resultados */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Total de aulas encontradas: <strong>{aulas.length}</strong>
                </Typography>
            </Box>

            {/* Tabela de Aulas */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : aulas.length === 0 ? (
                <Alert severity="info">Nenhuma aula encontrada com os filtros selecionados.</Alert>
            ) : (
                <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
                    <Table>
                        <TableHead sx={{ backgroundColor: theme.palette.primary.light }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'white' }}>Título</TableCell>
                                {!isMobile && <TableCell sx={{ fontWeight: 600, color: 'white' }}>Laboratório</TableCell>}
                                <TableCell sx={{ fontWeight: 600, color: 'white' }}>Data/Hora</TableCell>
                                {!isMobile && <TableCell sx={{ fontWeight: 600, color: 'white' }}>Autor</TableCell>}
                                <TableCell sx={{ fontWeight: 600, color: 'white' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayedAulas.map((aula) => (
                                <TableRow key={aula.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {aula.titulo || 'Sem título'}
                                        </Typography>
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            <Typography variant="body2">
                                                {aula.laboratorio || 'Não especificado'}
                                            </Typography>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatarData(aula.dataInicio)}
                                        </Typography>
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            <Typography variant="body2">
                                                {aula.autorNome || 'Desconhecido'}
                                            </Typography>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Chip
                                            icon={getStatusIcon(aula.status)}
                                            label={aula.status || 'Desconhecido'}
                                            size="small"
                                            sx={{
                                                backgroundColor: getStatusColor(aula.status),
                                                color: 'white',
                                                fontWeight: 500
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={aulas.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Aulas por página:"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                    />
                </TableContainer>
            )}
        </Container>
    );
};

export default ListagemCompletaAulas;
