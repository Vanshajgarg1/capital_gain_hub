import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function remediate() {
  // Update the module
  console.log("Updating module bb8d1857-7ecb-4db7-95f0-71d499a28df7...");
  const { error: updateError } = await supabase
    .from("modules")
    .update({ order_index: 2 })
    .eq("id", "bb8d1857-7ecb-4db7-95f0-71d499a28df7");

  if (updateError) {
    console.error("Failed to update:", updateError);
    return;
  }
  console.log("Update successful.\n");

  // Verify duplicates
  console.log("Verifying duplicates...");
  const { data: duplicates, error: dupError } = await supabase
    .rpc("query_duplicates_raw", {}) // We can't easily run complex GROUP BY in supabase-js without an RPC or postgres direct connection. 
    .select("*");
    
  // Since we don't have an RPC, let's just fetch all and check in JS.
  const { data: allModules, error: fetchError } = await supabase
    .from("modules")
    .select("id, title, course_id, order_index")
    .order("course_id")
    .order("order_index");

  if (fetchError) {
    console.error("Failed to fetch modules:", fetchError);
    return;
  }

  const dupMap = new Map();
  const seen = new Map();
  let duplicateGroupsCount = 0;

  for (const mod of allModules) {
    const key = `${mod.course_id}-${mod.order_index}`;
    if (seen.has(key)) {
      if (!dupMap.has(key)) {
        dupMap.set(key, [seen.get(key)]);
        duplicateGroupsCount++;
      }
      dupMap.get(key).push(mod);
    } else {
      seen.set(key, mod);
    }
  }

  console.log(`Duplicate groups found: ${duplicateGroupsCount}`);
  if (duplicateGroupsCount > 0) {
    console.log(JSON.stringify(Object.fromEntries(dupMap), null, 2));
  }
  console.log("");

  // Verify the specific course
  console.log("Verifying course 9e9b9326-bf16-4d89-878d-d8050918c2e1...");
  const { data: courseModules, error: courseError } = await supabase
    .from("modules")
    .select("id, course_id, title, order_index")
    .eq("course_id", "9e9b9326-bf16-4d89-878d-d8050918c2e1")
    .order("order_index");

  if (courseError) {
    console.error("Failed to fetch course modules:", courseError);
    return;
  }

  courseModules.forEach(m => {
    console.log(`${m.order_index} | ${m.title} (${m.id})`);
  });
}

remediate();
