import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function remediateModules() {
  const courseId = "9e9b9326-bf16-4d89-878d-d8050918c2e1";

  // 1. Fetch current modules for the course
  const { data: modules, error } = await supabase
    .from("modules")
    .select("id, title, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching modules:", error);
    return;
  }

  console.log("Current modules:", modules);

  // We need to map:
  // "Trading Fundamentals" -> 0
  // "Introduction to Financial Markets" -> 1
  // "Technical Analysis" -> 2
  // "Advanced Trading" -> 3

  const desiredOrder: Record<string, number> = {
    "Trading Fundamentals": 0,
    "Introduction to Financial Markets": 1,
    "Technical Analysis": 2,
    "Advanced Trading": 3
  };

  // 2. Safe transition (avoiding temporary unique constraint collisions if any existed, though they don't yet)
  console.log("Setting temporary high indices to avoid conflicts...");
  for (const mod of modules) {
    const { error: tempErr } = await supabase
      .from("modules")
      .update({ order_index: mod.order_index + 1000 })
      .eq("id", mod.id);
      
    if (tempErr) {
      console.error(`Failed to update ${mod.title} to temp index:`, tempErr);
      return;
    }
  }

  // 3. Set final indices
  console.log("Applying final 0-based indices...");
  for (const mod of modules) {
    const finalIndex = desiredOrder[mod.title];
    if (finalIndex === undefined) {
      console.warn(`Warning: module title "${mod.title}" not in desired order mapping!`);
      continue;
    }

    const { error: finalErr } = await supabase
      .from("modules")
      .update({ order_index: finalIndex })
      .eq("id", mod.id);

    if (finalErr) {
      console.error(`Failed to set final index for ${mod.title}:`, finalErr);
    } else {
      console.log(`Successfully updated ${mod.title} to order_index: ${finalIndex}`);
    }
  }

  console.log("Remediation complete.");
}

remediateModules();
