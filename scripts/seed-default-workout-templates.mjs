import { createClient } from '@supabase/supabase-js';
import { seedDefaultWorkoutTemplatesForClient } from '../src/utils/defaultWorkoutTemplates.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { data: clients, error } = await supabase
  .from('clients')
  .select('id, name, coach_email')
  .not('coach_email', 'is', null)
  .order('coach_email')
  .order('name');

if (error) throw error;

const results = [];

for (const client of clients || []) {
  const result = await seedDefaultWorkoutTemplatesForClient({
    supabase,
    coachEmail: client.coach_email,
    clientId: client.id,
  });

  results.push({
    clientId: client.id,
    clientName: client.name,
    coachEmail: client.coach_email,
    ...result,
  });
}

console.log(JSON.stringify({ ok: true, clients: results }, null, 2));
