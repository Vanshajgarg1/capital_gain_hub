import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("id, lessons!inner(modules!inner(course_id))")
    .eq("lessons.modules.course_id", "some-uuid")
    .limit(1);
    
  console.log("Error:", error);
}
main();
