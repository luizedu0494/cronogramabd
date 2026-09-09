export interface Usuario {
  uid: string;
  email: string;
  nome: string;
  cargo: 'admin' | 'coordenador' | 'professor' | 'tecnico';
  status: 'aprovado' | 'pendente' | 'rejeitado';
  foto_url?: string;
  criado_em?: string;
}

export interface Aula {
  id: string;
  disciplina: string;
  professor: string;
  professor_uid?: string;
  laboratorio: string;
  data: string; // YYYY-MM-DD
  horario_inicio: string;
  horario_fim: string;
  observacoes?: string;
  grupo_id?: string;
  tecnicos_designados?: string[];
  status_aprovacao?: 'aprovada' | 'pendente' | 'rejeitada';
  solicitante_uid?: string;
  criada_em?: string;
}

export interface Notificacao {
  id: string;
  destinatario_uid: string;
  tipo:
    | 'aula_adicionada'
    | 'aula_editada'
    | 'aula_excluida'
    | 'evento_manutencao'
    | 'aviso_normal'
    | 'aviso_importante'
    | 'aviso_urgente'
    | 'aprovacao_proposta'
    | 'lembrete_aula';
  titulo: string;
  corpo: string;
  lida: boolean;
  aula_id?: string;
  evento_id?: string;
  aviso_id?: string;
  criada_em: string;
  lida_em?: string;
}

export interface PushTokenMobile {
  id: string;
  user_uid: string;
  expo_token: string;
  platform: 'ios' | 'android';
  device_name?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
