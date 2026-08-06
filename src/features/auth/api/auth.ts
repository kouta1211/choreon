import { createClient } from "@/lib/supabase/client";

export function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUpWithPassword(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signUp({ email, password });
}

export function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}
