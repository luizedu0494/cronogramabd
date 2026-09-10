import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Badge
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useNavigate } from 'react-router-dom';
import { NotificacaoItem } from '../hooks/useNotificacoes';

interface CentroNotificacoesDrawerProps {
  open: boolean;
  onClose: () => void;
  notificacoes: NotificacaoItem[];
  naoLidas: number;
  carregando: boolean;
  marcarLida: (id: string) => Promise<void>;
  marcarTodasLidas: () => Promise<void>;
}

export const CentroNotificacoesDrawer: React.FC<CentroNotificacoesDrawerProps> = ({
  open,
  onClose,
  notificacoes,
  naoLidas,
  carregando,
  marcarLida,
  marcarTodasLidas,
}) => {
  const navigate = useNavigate();

  const handleItemClick = async (item: NotificacaoItem) => {
    if (!item.lida) {
      await marcarLida(item.id);
    }
    if (item.aula_id) {
      navigate('/minhas-designacoes');
    }
    onClose();
  };

  const getTipoChipColor = (tipo: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    if (tipo.includes('urgente') || tipo.includes('excluida')) return 'error';
    if (tipo.includes('designacao') || tipo.includes('adicionada')) return 'primary';
    if (tipo.includes('editada') || tipo.includes('evento')) return 'warning';
    return 'info';
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Badge badgeContent={naoLidas} color="error">
            <NotificationsNoneIcon color="primary" />
          </Badge>
          <Typography variant="h6" fontWeight={700}>Notificações</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      {naoLidas > 0 && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={marcarTodasLidas}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Marcar todas como lidas ({naoLidas})
          </Button>
        </Box>
      )}

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {carregando ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress size={32} />
          </Box>
        ) : notificacoes.length === 0 ? (
          <Box textAlign="center" p={4} color="text.secondary">
            <NotificationsNoneIcon sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2">Nenhuma notificação por enquanto.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notificacoes.map((item) => (
              <React.Fragment key={item.id}>
                <ListItem
                  onClick={() => handleItemClick(item)}
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    bgcolor: item.lida ? 'transparent' : 'action.selected',
                    transition: 'background-color 0.2s',
                    py: 1.5,
                    px: 2,
                    borderLeft: item.lida ? '3px solid transparent' : '3px solid #1E7EC8'
                  }}
                >
                  <Box width="100%" display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Chip
                      label={item.tipo.replace('_', ' ')}
                      size="small"
                      color={getTipoChipColor(item.tipo)}
                      sx={{ height: 20, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.criada_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                  <ListItemText
                    primary={<Typography variant="subtitle2" fontWeight={item.lida ? 500 : 700}>{item.titulo}</Typography>}
                    secondary={<Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>{item.corpo}</Typography>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
};

export default CentroNotificacoesDrawer;
