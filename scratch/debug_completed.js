import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, payments (*)")
    .eq("status", "COMPLETED");
  console.log("Completed Orders:", JSON.stringify(orders, null, 2));
  if (error) console.error("Error:", error);
}

run();
