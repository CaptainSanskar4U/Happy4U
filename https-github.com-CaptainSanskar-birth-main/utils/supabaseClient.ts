
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qzpmmiisacltzteejnbw.supabase.co';

// UPDATED: Using the PUBLISHABLE (Anon) key. 
// This is safe to use in the browser and fixes the "Forbidden" error.
const SUPABASE_ANON_KEY = 'sb_publishable_Oi32mtVj0a8_3qDSuHuMww_5QciS3Rv'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Review {
    id: number;
    created_at: string;
    name: string;
    rating: number;
    content: string;
    is_anonymous: boolean;
}
