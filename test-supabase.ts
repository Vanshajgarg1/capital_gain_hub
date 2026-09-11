import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function main() {
  const { data, error } = await supabase.from("faqs").select("*");
  console.log("FAQs:", { data, error });

  const { data: cData, error: cError } = await supabase.from("courses").select("*");
  console.log("Courses:", { data: cData, error: cError });
}

main();
