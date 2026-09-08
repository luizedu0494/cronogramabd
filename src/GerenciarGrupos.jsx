import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Paper, Typography, Box, Button, List, ListItem, ListItemText,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    FormGroup, FormControlLabel, Checkbox, CircularProgress, Alert, Chip,
    Autocomplete, Stack, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { grupoService, Grupo } from './services/grupoService';
import { userService } from './services/userService';
import { LISTA_LABORATORIOS } from './constants/laboratorios';

const CORES_PALETA = ['#1E7EC8', '#00C853', '#F5C518', '#E53935', '#9C27B0', '#FF9800', '#00BCD4'];

function GerenciarGrupos() {
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentGrupo, setCurrentGrupo] = useState<Grupo | null>(null);

    const [nomeGrupo, setNomeGrupo] = useState('');
    const [descricaoGrupo, setDescricaoGrupo] = useState('');
    const [corGrupo, setCorGrupo] = useState('#1E7EC8');
    const [labsAssociados, setLabsAssociados] = useState<string[]>([]);
    const [selectedTecnicos, setSelectedTecnicos] = useState<string[]>([]);

    const [allTecnicos, setAllTecnicos] = useState<any[]>([]);
    const [loadingTecnicos, setLoadingTecnicos] = useState(false);
    const [error, setError] = useState('');

    const loadGrupos = useCallback(async () => {
        setLoading(true);
        try {
            const data = await grupoService.listarGrupos();
            setGrupos(data);
        } catch (err) {
            console.error("Erro ao buscar grupos:", err);
            setError("Não foi possível carregar os grupos.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGrupos();
    }, [loadGrupos]);

    const fetchAllTecnicos = useCallback(async () => {
        setLoadingTecnicos(true);
        try {
            const tecnicosData = await userService.getAllUsers();
            const apenasTecnicos = (tecnicosData || []).filter(u => u.role === 'tecnico' || u.role === 'coordenador');
            setAllTecnicos(apenasTecnicos);
        } catch (err) {
            console.error("Erro ao buscar técnicos:", err);
            setError("Falha ao carregar lista de técnicos.");
        } finally {
            setLoadingTecnicos(false);
        }
    }, []);

    const handleOpenDialog = (grupo: Grupo | null = null) => {
        fetchAllTecnicos();
        if (grupo) {
            setIsEditing(true);
            setCurrentGrupo(grupo);
            setNomeGrupo(grupo.nome);
            setDescricaoGrupo(grupo.descricao || '');
            setCorGrupo(grupo.cor || '#1E7EC8');
            setLabsAssociados(grupo.labs_associados || []);
            setSelectedTecnicos(grupo.membros_uids || []);
        } else {
            setIsEditing(false);
            setCurrentGrupo(null);
            setNomeGrupo('');
            setDescricaoGrupo('');
            setCorGrupo('#1E7EC8');
            setLabsAssociados([]);
            setSelectedTecnicos([]);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setError('');
    };

    const handleToggleTecnico = (tecnicoUid: string) => {
        setSelectedTecnicos(prev =>
            prev.includes(tecnicoUid) ? prev.filter(id => id !== tecnicoUid) : [...prev, tecnicoUid]
        );
    };

    const handleSaveGrupo = async () => {
        if (!nomeGrupo.trim()) {
            setError("O nome do grupo é obrigatório.");
            return;
        }

        try {
            if (isEditing && currentGrupo) {
                await grupoService.atualizarGrupo(currentGrupo.id, {
                    nome: nomeGrupo.trim(),
                    descricao: descricaoGrupo.trim(),
                    cor: corGrupo,
                    labs_associados: labsAssociados,
                    membros_uids: selectedTecnicos,
                });
            } else {
                const userSessionStr = localStorage.getItem('cronolab_user_session');
                const currentUser = userSessionStr ? JSON.parse(userSessionStr) : null;
                const criadoPorUid = currentUser?.uid || 'usr_coordenador';

                await grupoService.criarGrupo({
                    nome: nomeGrupo.trim(),
                    descricao: descricaoGrupo.trim(),
                    cor: corGrupo,
                    labs_associados: labsAssociados,
                    criado_por_uid: criadoPorUid,
                    membros_uids: selectedTecnicos,
                });
            }
            handleCloseDialog();
            loadGrupos();
        } catch (err) {
            console.error("Erro ao salvar grupo:", err);
            setError("Ocorreu um erro ao salvar o grupo.");
        }
    };

    const handleDeleteGrupo = async (grupoId: string) => {
        if (window.confirm("Tem certeza que deseja apagar este grupo?")) {
            try {
                await grupoService.deletarGrupo(grupoId);
                loadGrupos();
            } catch (err) {
                console.error("Erro ao apagar grupo:", err);
                setError("Ocorreu um erro ao apagar o grupo.");
            }
        }
    };

    return (
        <Container maxWidth="md">
            <Paper sx={{ p: 3, mt: 4, borderRadius: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Grupos de Técnicos</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Organize técnicos por laboratório ou especialidade para designação rápida e avisos.
                        </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ fontWeight: 700 }}>
                        Criar Grupo
                    </Button>
                </Box>
                {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
                    <List>
                        {grupos.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center" py={4}>
                                Nenhum grupo cadastrado ainda. Clique em "Criar Grupo" para começar.
                            </Typography>
                        ) : (
                            grupos.map(grupo => (
                                <ListItem
                                    key={grupo.id}
                                    sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 2 }}
                                    secondaryAction={
                                        <>
                                            <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(grupo)}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteGrupo(grupo.id)}>
                                                <DeleteIcon color="error" />
                                            </IconButton>
                                        </>
                                    }
                                >
                                    <Box display="flex" alignItems="center" gap={1.5} flexGrow={1}>
                                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: grupo.cor || '#1E7EC8' }} />
                                        <ListItemText
                                            primary={<Typography variant="subtitle1" fontWeight={700}>{grupo.nome}</Typography>}
                                            secondary={
                                                <React.Fragment>
                                                    {grupo.descricao && <Typography variant="body2" color="text.secondary">{grupo.descricao}</Typography>}
                                                    <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                                                        <Chip label={`${grupo.membros_count || 0} membro(s)`} size="small" variant="outlined" />
                                                        {grupo.labs_associados?.map(lab => (
                                                            <Chip key={lab} label={lab} size="small" color="primary" variant="outlined" />
                                                        ))}
                                                    </Box>
                                                </React.Fragment>
                                            }
                                        />
                                    </Box>
                                </ListItem>
                            ))
                        )}
                    </List>
                )}
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
                <DialogTitle fontWeight={700}>{isEditing ? 'Editar Grupo' : 'Criar Novo Grupo'}</DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome do Grupo"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={nomeGrupo}
                        onChange={(e) => setNomeGrupo(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="Descrição (Opcional)"
                        type="text"
                        fullWidth
                        multiline
                        rows={2}
                        variant="outlined"
                        value={descricaoGrupo}
                        onChange={(e) => setDescricaoGrupo(e.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <Typography variant="subtitle2" gutterBottom>Cor do Grupo:</Typography>
                    <Stack direction="row" gap={1} mb={2}>
                        {CORES_PALETA.map(cor => (
                            <Box
                                key={cor}
                                onClick={() => setCorGrupo(cor)}
                                sx={{
                                    width: 30, height: 30, borderRadius: '50%',
                                    bgcolor: cor, cursor: 'pointer',
                                    border: corGrupo === cor ? '3px solid black' : '3px solid transparent',
                                    transition: 'transform 0.1s',
                                    '&:hover': { transform: 'scale(1.1)' }
                                }}
                            />
                        ))}
                    </Stack>

                    <Autocomplete
                        multiple
                        options={LISTA_LABORATORIOS.map(l => l.name || l.id)}
                        value={labsAssociados}
                        onChange={(_, newValue) => setLabsAssociados(newValue)}
                        renderInput={(params) => (
                            <TextField {...params} variant="outlined" label="Laboratórios Gerenciados" placeholder="Selecione os labs" />
                        )}
                        sx={{ mb: 2 }}
                    />

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>Membros do Grupo:</Typography>
                    {loadingTecnicos ? <CircularProgress size={24} /> : (
                        <FormGroup sx={{ maxHeight: 200, overflowY: 'auto' }}>
                            {allTecnicos.map(tecnico => (
                                <FormControlLabel
                                    key={tecnico.uid || tecnico.id}
                                    control={
                                        <Checkbox
                                            checked={selectedTecnicos.includes(tecnico.uid || tecnico.id)}
                                            onChange={() => handleToggleTecnico(tecnico.uid || tecnico.id)}
                                        />
                                    }
                                    label={`${tecnico.name || tecnico.email} (${tecnico.role})`}
                                />
                            ))}
                        </FormGroup>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button onClick={handleSaveGrupo} variant="contained" fontWeight={700}>Salvar Grupo</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default GerenciarGrupos;