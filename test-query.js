import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // First login as the student
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // I don't know the exact email, but I can check if RLS is the issue by just calling the query as anon
    password: 'password'
  });

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      course:courses ( title, thumbnail_url ),
      payments (*)
    `)
    .order("created_at", { ascending: false });

  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
}
test();
