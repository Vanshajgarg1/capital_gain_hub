import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userId = "a4aaa9d6-e316-483d-9db3-0fe89914648b";
  console.log("Fetching orders for user:", userId);
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, course:courses ( title, thumbnail_url ), payments (*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  console.log("Orders:", JSON.stringify(orders, null, 2));
  if (error) console.error("Error:", error);
}

run();
