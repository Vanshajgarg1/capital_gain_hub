import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles:', pErr ? pErr.message : profiles);
  const { data: enrollments, error: eErr } = await supabase.from('enrollments').select('*, course:courses(title)').limit(1);
  console.log('Enrollments:', eErr ? eErr.message : enrollments);
  const { data: progress, error: prErr } = await supabase.from('lesson_progress').select('*').limit(1);
  console.log('Progress:', prErr ? prErr.message : progress);
}
test();
