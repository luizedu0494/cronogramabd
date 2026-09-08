// src/supabaseConfig.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sua-instancia.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-anonima-publica';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
