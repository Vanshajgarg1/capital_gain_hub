const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id, video_provider, video_id, is_free_preview, module:modules!inner(course_id)")
    .eq("id", "0194f839-30de-4443-afd0-9d85aaf46896")
    .single();
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
