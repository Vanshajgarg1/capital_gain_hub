import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching orders...");
  const { data: orders, error } = await supabase.from('orders').select('*, profiles:user_id(full_name)');
  console.log("Orders:", JSON.stringify(orders, null, 2));
  if (error) console.error("Error:", error);
}

run();
