import React from 'react';
import { Box, Paper, Skeleton } from '@mui/material';

export default function TableSkeleton({ rows = 5, height = 50 }) {
  return (
    <Box sx={{ width: '100%', my: 2 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Paper
          key={index}
          elevation={1}
          sx={{
            p: 2,
            mb: 1.5,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ width: '40%' }}>
            <Skeleton variant="text" width="80%" height={24} />
            <Skeleton variant="text" width="50%" height={18} />
          </Box>
          <Box sx={{ width: '30%', display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" width={80} height={24} />
            <Skeleton variant="rounded" width={80} height={24} />
          </Box>
          <Box sx={{ width: '20%', display: 'flex', justifyContent: 'flex-end' }}>
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
