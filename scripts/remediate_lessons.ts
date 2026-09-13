import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const moduleId = "bb8d1857-7ecb-4db7-95f0-71d499a28df7";

  // 1. Fetch lessons to inspect intended order based on created_at
  const { data: lessons, error: fetchError } = await supabaseAdmin
    .from("lessons")
    .select("id, title, order_index, created_at")
    .eq("module_id", moduleId)
    .order("created_at", { ascending: true });

  if (fetchError || !lessons) {
    console.error("Failed to fetch lessons", fetchError);
    return;
  }

  console.log("=== ORIGINAL LESSONS (Ordered by created_at) ===");
  lessons.forEach((l, idx) => {
    console.log(`[created: ${l.created_at}] order: ${l.order_index} | ${l.title} (${l.id})`);
  });
  console.log("\n");

  // Since created_at determines the intended sequence when there are duplicates/conflicts:
  // The lessons array is already ordered by intended chronological creation.
  
  // 2. We assign temporary high order values to avoid unique constraint conflicts
  // (Though there is no unique constraint yet, the instructions say "Use temporary high order values if needed")
  console.log("=== APPLYING REMEDIATION ===");
  for (let i = 0; i < lessons.length; i++) {
    const tempIndex = 9000 + i;
    const l = lessons[i];
    await supabaseAdmin
      .from("lessons")
      .update({ order_index: tempIndex })
      .eq("id", l.id);
  }

  // 3. Assign final 0-based contiguous indexes
  for (let i = 0; i < lessons.length; i++) {
    const l = lessons[i];
    await supabaseAdmin
      .from("lessons")
      .update({ order_index: i })
      .eq("id", l.id);
  }

  // 4. Verification 1: Check correct order
  console.log("=== VERIFICATION 1: CURRENT ORDER ===");
  const { data: verifiedLessons } = await supabaseAdmin
    .from("lessons")
    .select("id, module_id, title, order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });

  verifiedLessons?.forEach(l => {
    console.log(`${l.order_index} | ${l.title}`);
  });
  console.log("\n");

  // 5. Verification 2: Check duplicates
  console.log("=== VERIFICATION 2: DUPLICATES ===");
  const { data: allModLessons } = await supabaseAdmin
    .from("lessons")
    .select("module_id, order_index");

  const counts: Record<string, number> = {};
  allModLessons?.forEach(l => {
    const key = `${l.module_id}-${l.order_index}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  let duplicateCount = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > 1) {
      console.log(`Duplicate found: ${key} has ${count} lessons`);
      duplicateCount++;
    }
  }

  console.log(`\nDuplicate groups: ${duplicateCount}`);
}

main();
