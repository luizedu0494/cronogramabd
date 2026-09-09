import React from 'react';
import { Chip } from '@mui/material';

/**
 * Utilitário central para mapeamento de cores e rótulos de status de aulas/eventos/propostas.
 */
export const STATUS_MAP = {
    aprovada:   { color: 'success', label: 'Aprovada' },
    confirmada: { color: 'success', label: 'Confirmada' },
    realizada:  { color: 'success', label: 'Realizada' },
    pendente:   { color: 'warning', label: 'Pendente' },
    planejada:  { color: 'warning', label: 'Planejada' },
    rejeitada:  { color: 'error',   label: 'Rejeitada' },
    cancelada:  { color: 'error',   label: 'Cancelada' },
    concluida:  { color: 'info',    label: 'Concluída' },
    em_andamento: { color: 'info',  label: 'Em Andamento' },
};

/**
 * Retorna um elemento `<Chip>` estilizado de acordo com o status fornecido.
 */
export const getStatusChip = (status, options = {}) => {
    const sKey = (status || 'aprovada').toLowerCase().trim();
    const config = STATUS_MAP[sKey] || { color: 'default', label: status || 'Indefinido' };

    const {
        size = 'small',
        variant = 'outlined',
        height = 20,
        fontSize = '0.68rem',
        sx = {},
        ...restProps
    } = options;

    return (
        <Chip
            label={config.label}
            color={config.color}
            size={size}
            variant={variant}
            sx={{ height, fontSize, fontWeight: 500, ...sx }}
            {...restProps}
        />
    );
};
