
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oiylovqsimogtrdqqapp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peWxvdnFzaW1vZ3RyZHFxYXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzA5NzcsImV4cCI6MjA2ODg0Njk3N30.JSt0mtNyXwhPqaRBFrlgkkmJ4WcOXSUqYgtaJudeJEg';

export const supabase = createClient(supabaseUrl, supabaseKey);
