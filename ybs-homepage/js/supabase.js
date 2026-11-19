
const SUPABASE_URL = "https://xbdfboblvpkuvzpibxar.supabase.co/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nqK6KNqPbKmIuX21NcVaEQ_mhJNVubo";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

window.ybsSupabase = supabaseClient;

console.log("YBS Supabase 연결 준비 완료");
