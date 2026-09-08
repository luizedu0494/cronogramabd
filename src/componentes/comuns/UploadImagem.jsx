import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography, Alert } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { supabase } from '../../supabaseConfig';

export default function UploadImagem({ onUploadSucesso, pasta = 'cronolab', rotulo = 'Enviar Imagem' }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErro('A imagem deve ter no máximo 5MB.');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const bucketName = 'cronolab-media';

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.warn('Upload Supabase Storage falhou, tentando criar URL Data Base64:', error.message);
        // Fallback local Base64 em caso de bucket nao configurado como publico
        const reader = new FileReader();
        reader.onloadend = () => {
          if (onUploadSucesso) onUploadSucesso(reader.result);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Obter URL publica da imagem
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      if (publicUrl && onUploadSucesso) {
        onUploadSucesso(publicUrl);
      }
    } catch (err) {
      console.error('Erro no upload de imagem:', err);
      setErro(err.message || 'Ocorreu um erro ao enviar a imagem.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
      <Button
        variant="contained"
        component="label"
        startIcon={carregando ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        disabled={carregando}
      >
        {carregando ? 'Enviando...' : rotulo}
        <input type="file" accept="image/*" hidden onChange={handleFileChange} />
      </Button>
      {erro && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {erro}
        </Alert>
      )}
    </Box>
  );
}
