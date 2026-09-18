import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, TextField, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, Box, InputAdornment, Chip, Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ScienceIcon from '@mui/icons-material/Science';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { LISTA_LABORATORIOS } from '../constants/laboratorios';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const paginas = [
    { title: 'Cronograma Semanal', path: '/cronograma', icon: <CalendarMonthIcon color="primary" /> },
    { title: 'Consulta de Disponibilidade', path: '/disponibilidade', icon: <ScienceIcon color="secondary" /> },
    { title: 'Gerenciar Aulas', path: '/gerenciar-aulas', icon: <EventNoteIcon color="action" /> },
    { title: 'Gerenciar Eventos / Manutenção', path: '/gerenciar-eventos', icon: <EventNoteIcon color="action" /> },
    { title: 'Propor Nova Aula', path: '/propor-aula', icon: <AddCircleOutlineIcon color="success" /> },
    { title: 'Ajuda & FAQ', path: '/ajuda', icon: <HelpOutlineIcon color="info" /> },
  ];

  const laboratorios = LISTA_LABORATORIOS.map((lab) => ({
    title: `Laboratório: ${lab.name}`,
    path: `/disponibilidade?lab=${encodeURIComponent(lab.name)}`,
    icon: <ScienceIcon color="primary" />,
    tipo: lab.tipo
  }));

  const todosItens = [...paginas, ...laboratorios];

  const itensFiltrados = query.trim()
    ? todosItens.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
    : todosItens.slice(0, 8);

  const handleSelect = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          top: -100,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }
      }}
    >
      <DialogContent sx={{ p: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} px={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Comandos & Navegação Rápida
          </Typography>
          <Chip label="ESC para fechar" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
        </Box>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Digite para buscar página, laboratório ou ação... (⌘K / Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            )
          }}
          sx={{ mb: 1 }}
        />
        <List sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {itensFiltrados.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              Nenhum comando ou laboratório encontrado.
            </Typography>
          ) : (
            itensFiltrados.map((item, idx) => (
              <ListItem key={idx} disablePadding>
                <ListItemButton
                  onClick={() => handleSelect(item.path)}
                  sx={{ borderRadius: 1.5, mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.tipo ? `Tipo: ${item.tipo}` : null}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
