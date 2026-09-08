import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseConfig';

import {
    Container, Typography, Box, Paper, CircularProgress, Alert,
    List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    MenuItem, Select, FormControl, InputLabel, Tooltip, Snackbar
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmptyState from '../../components/EmptyState';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';

const ROLES = ['coordenador', 'tecnico'];

function GerenciarUsuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [usuarioParaEditar, setUsuarioParaEditar] = useState(null);
    const [novoRole, setNovoRole] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
    const [loadingStates, setLoadingStates] = useState({});

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setUsuarios((data || []).map(u => ({
                id: u.uid,
                ...u,
                approvalPending: u.approval_pending
            })));
        } catch (err) {
            console.error('Erro ao buscar usuários:', err);
            setError("Não foi possível carregar os usuários.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();

        // Subscrição Realtime no Supabase
        const channel = supabase
            .channel('users-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                fetchUsuarios();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleAction = async (action, userId, payload) => {
        setLoadingStates(prev => ({ ...prev, [userId]: true }));
        try {
            let successMessage = '';
            if (action === 'approve') {
                await supabase.from('users').update({ approval_pending: false, status: 'aprovado' }).eq('uid', userId);
                successMessage = 'Usuário aprovado com sucesso!';
            } else if (action === 'reject') {
                await supabase.from('users').update({ approval_pending: false, status: 'rejeitado' }).eq('uid', userId);
                successMessage = 'Usuário rejeitado. O acesso foi negado.';
            } else if (action === 'editRole') {
                await supabase.from('users').update({ role: payload.role, approval_pending: false, status: 'aprovado' }).eq('uid', userId);
                successMessage = `Cargo atualizado para "${payload.role}" e acesso liberado!`;
            } else if (action === 'delete') {
                await supabase.from('users').delete().eq('uid', userId);
                successMessage = 'Usuário removido do banco com sucesso!';
            }
            setFeedback({ open: true, message: successMessage, severity: 'success' });
        } catch (err) {
            setFeedback({ open: true, message: `Erro: ${err.message}`, severity: 'error' });
        } finally {
            setLoadingStates(prev => ({ ...prev, [userId]: false }));
            setOpenEditDialog(false);
            setOpenDeleteDialog(false);
        }
    };

    const handleAbrirEditDialog = (usuario) => {
        setUsuarioParaEditar(usuario);
        setNovoRole(usuario.role || '');
        setOpenEditDialog(true);
    };

    const handleOpenDeleteDialog = (user) => {
        setUserToDelete(user);
        setOpenDeleteDialog(true);
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setFeedback(prev => ({ ...prev, open: false }));
    };

    if (loading) return (<Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>);
    if (error) return (<Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>);

    return (
        <Container maxWidth="lg">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h4" gutterBottom>Gerenciar Usuários</Typography>
                {usuarios.length === 0 ? (
                    <EmptyState 
                        icon={PeopleOutlineIcon}
                        title="Nenhum usuário encontrado"
                        message="Ainda não há usuários cadastrados ou aguardando aprovação no sistema."
                    />
                ) : (
                    <List>
                        {usuarios.map((user) => (
                            <ListItem key={user.id} divider>
                                <ListItemText
                                    primary={`${user.name} (${user.email})`}
                                    secondary={<>
                                        {user.role ? (
                                            <Chip label={user.role === 'coordenador' ? 'Coordenador' : 'Técnico'} size="small" sx={{ mr: 1 }} color={user.role === 'coordenador' ? 'primary' : 'secondary'} />
                                        ) : (
                                            <Chip label="Sem Cargo" size="small" sx={{ mr: 1 }} variant="outlined" />
                                        )}
                                        {user.status === 'rejeitado' ? (
                                            <Chip label="Recusado" size="small" color="error" />
                                        ) : user.approvalPending ? (
                                            <Chip label="Pendente" size="small" color="warning" />
                                        ) : (
                                            <Chip label="Aprovado" size="small" color="success" variant="outlined" />
                                        )}
                                    </>}
                                />
                                <ListItemSecondaryAction>
                                    {loadingStates[user.id] ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        <>
                                            {user.approvalPending && (
                                                <>
                                                    <Tooltip title="Aprovar Usuário"><IconButton edge="end" onClick={() => handleAction('approve', user.id)} sx={{ mr: 0.5 }}><CheckCircleIcon color="success" /></IconButton></Tooltip>
                                                    <Tooltip title="Rejeitar Usuário"><IconButton edge="end" onClick={() => handleAction('reject', user.id)} sx={{ mr: 0.5 }}><CancelIcon color="error" /></IconButton></Tooltip>
                                                </>
                                            )}
                                            <Tooltip title="Editar Cargo"><IconButton edge="end" onClick={() => handleAbrirEditDialog(user)} sx={{ mr: 0.5 }}><EditIcon color="info" /></IconButton></Tooltip>
                                            <Tooltip title="Excluir Usuário"><IconButton onClick={() => handleOpenDeleteDialog(user)} color="error"><DeleteIcon /></IconButton></Tooltip>
                                        </>
                                    )}
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
                <DialogTitle>Editar Cargo de {usuarioParaEditar?.name}</DialogTitle>
                <DialogContent><FormControl sx={{ minWidth: 140, mt: 2 }}><InputLabel shrink>Cargo</InputLabel><Select value={novoRole} label="Cargo" onChange={(e) => setNovoRole(e.target.value)}>{ROLES.map(role => <MenuItem key={role} value={role}>{role}</MenuItem>)}</Select></FormControl></DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
                    <Button onClick={() => handleAction('editRole', usuarioParaEditar.id, { role: novoRole })} variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>
            
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <Typography>Tem certeza que deseja remover o usuário "{userToDelete?.name}" do sistema?</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>
                        O acesso do usuário será revogado imediatamente. Caso ele tente fazer login novamente, precisará de uma nova aprovação da coordenação.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
                    <Button onClick={() => handleAction('delete', userToDelete.id)} color="error" variant="contained">Confirmar Exclusão</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={feedback.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={feedback.severity} sx={{ width: '100%' }}>{feedback.message}</Alert>
            </Snackbar>
        </Container>
    );
}

export default GerenciarUsuarios;
