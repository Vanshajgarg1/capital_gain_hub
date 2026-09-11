import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { count, error } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "STUDENT");
  console.log("ACTUAL_STUDENT_COUNT:", count);
  console.log("ERROR:", error);
}

run();
