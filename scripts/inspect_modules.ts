import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectModules() {
  const { data, error } = await supabase
    .from("modules")
    .select("id, title, order_index")
    .eq("course_id", "9e9b9326-bf16-4d89-878d-d8050918c2e1")
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching modules:", error);
    return;
  }
  
  console.log("Current modules for course:");
  console.log(data);
}

inspectModules();
