import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('testimonials').select(`
    *,
    course:courses(id, title)
  `).order('created_at', { ascending: false });
  
  if (error) {
    console.log("ERROR:");
    console.log("message:", error.message);
    console.log("code:", error.code);
    console.log("details:", error.details);
    console.log("hint:", error.hint);
  } else {
    console.log("SUCCESS");
    console.log(data);
  }
}

run();
