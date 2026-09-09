import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vejzpjemmgiucidewbdw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jr0oMAns84-ZRSIsxCghfg_RSvKWuMv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
