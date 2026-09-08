const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Inicializar Firebase Admin
const fs = require('fs');
const path = require('path');

let firestore;

try {
  let serviceAccountPath;
  const scriptsDir = __dirname;
  const files = fs.readdirSync(scriptsDir);
  const jsonFile = files.find(f => f.endsWith('.json') && (f.includes('serviceAccount') || f.includes('firebase-admin') || f.includes('cronolab')));
  
  if (jsonFile) {
    serviceAccountPath = path.join(scriptsDir, jsonFile);
    console.log(`Usando credencial Firebase Admin: ${jsonFile}`);
  } else {
    serviceAccountPath = path.join(scriptsDir, 'serviceAccountKey.json');
  }

  const serviceAccount = require(serviceAccountPath);
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  firestore = getFirestore();
} catch (err) {
  console.error('Erro ao inicializar Firebase Admin:', err.message);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no ambiente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrarUsers() {
  console.log('Migrando coleção users...');
  const snapshot = await firestore.collection('users').get();
  let ok = 0, erros = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { error } = await supabase.from('users').upsert({
      uid:              doc.id,
      name:             data.name || data.displayName || 'Sem nome',
      email:            data.email || '',
      role:             data.role || null,
      status:           data.status || (data.approvalPending ? 'pendente' : 'aprovado'),
      approval_pending: data.approvalPending ?? true,
      photo_url:        data.photoURL || null,
      telegram_chat_id: data.telegramChatId || null,
      created_at:       data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }, { onConflict: 'uid' });
    
    if (error) {
      console.error(`Erro user ${doc.id}:`, error.message);
      erros++;
    } else {
      ok++;
    }
  }
  console.log(`✓ Users: ${ok} migrados (${erros} erros)`);
}

async function migrarAulas() {
  console.log('Migrando coleção aulas...');
  const snapshot = await firestore.collection('aulas').get();
  let ok = 0, erros = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    const dataInicio = data.dataInicio?.toDate?.() || new Date(data.dataInicio || Date.now());
    const dataFim    = data.dataFim?.toDate?.()    || new Date(data.dataFim || dataInicio);
    
    const { error } = await supabase.from('aulas').upsert({
      assunto:           data.assunto || 'Sem assunto',
      tipo_atividade:    data.tipoAtividade || 'aula',
      laboratorio:       data.laboratorioSelecionado || data.laboratorio || 'Geral',
      horario_slot:      data.horarioSlotString || '',
      data_inicio:       dataInicio.toISOString(),
      data_fim:          dataFim.toISOString(),
      status:            data.status || 'pendente',
      proposto_por_uid:  data.propostoPorUid || data.userId || null,
      proposto_por_nome: data.propostoPorNome || data.proponenteNome || null,
      is_revisao:        data.isRevisao || false,
      tipo_revisao_label:data.tipoRevisaoLabel || null,
      liga:              data.liga || null,
      observacoes:       data.observacoes || null,
      origem:            data.origem || 'manual',
      firestore_id:      doc.id,
    }, { onConflict: 'firestore_id' });
    
    if (error) {
      console.error(`Erro aula ${doc.id}:`, error.message);
      erros++;
      continue;
    }
    
    // Inserir cursos vinculados
    if (Array.isArray(data.cursos) && data.cursos.length > 0) {
      const { data: aulaInserida } = await supabase
        .from('aulas')
        .select('id')
        .eq('firestore_id', doc.id)
        .single();
      
      if (aulaInserida) {
        await supabase.from('aula_cursos').upsert(
          data.cursos.map(curso => ({ aula_id: aulaInserida.id, curso })),
          { onConflict: 'aula_id,curso' }
        );
      }
    }
    ok++;
  }
  console.log(`✓ Aulas: ${ok} migradas (${erros} erros)`);
}

async function migrarEventos() {
  console.log('Migrando coleção eventosManutencao...');
  const snapshot = await firestore.collection('eventosManutencao').get();
  let ok = 0, erros = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { error } = await supabase.from('eventos_manutencao').upsert({
      titulo:          data.titulo || 'Evento sem título',
      descricao:       data.descricao || null,
      tipo:            data.tipo || 'Manutenção',
      status:          data.status || 'aprovado',
      laboratorio:     data.laboratorio || 'Todos',
      horario_slot:    data.horarioSlotString || null,
      data_inicio:     data.dataInicio?.toDate?.()?.toISOString() || new Date().toISOString(),
      data_fim:        data.dataFim?.toDate?.()?.toISOString()    || new Date().toISOString(),
      criado_por_uid:  data.criadoPorUid || null,
      criado_por_nome: data.criadoPorNome || null,
      firestore_id:    doc.id,
    }, { onConflict: 'firestore_id' });
    
    if (error) {
      console.error(`Erro evento ${doc.id}:`, error.message);
      erros++;
    } else {
      ok++;
    }
  }
  console.log(`✓ Eventos de Manutenção: ${ok} migrados (${erros} erros)`);
}

async function migrarAvisos() {
  console.log('Migrando coleção avisos...');
  const snapshot = await firestore.collection('avisos').get();
  let ok = 0, erros = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const { error } = await supabase.from('avisos').upsert({
      titulo:         data.titulo || 'Aviso sem título',
      conteudo:       data.conteudo || data.mensagem || '',
      tipo:           data.tipo || 'normal',
      criado_por_uid: data.criadoPorUid || null,
      firestore_id:   doc.id,
      created_at:     data.criadoEm?.toDate?.()?.toISOString() || new Date().toISOString(),
    }, { onConflict: 'firestore_id' });
    
    if (error) {
      console.error(`Erro aviso ${doc.id}:`, error.message);
      erros++;
    } else {
      ok++;
    }
  }
  console.log(`✓ Avisos: ${ok} migrados (${erros} erros)`);
}

async function main() {
  console.log('=== Iniciando Processo ETL: Firestore -> PostgreSQL (Supabase) ===\n');
  
  await migrarUsers();
  await migrarAulas();
  await migrarEventos();
  await migrarAvisos();
  
  console.log('\n=== Processo de migração finalizado com sucesso! ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal no processo de migração:', err);
  process.exit(1);
});
