export function getSupabaseFunctionUrl(name: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("VITE_SUPABASE_URL is not configured");
  }

  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/${name}`;
}

export function getSupabaseFunctionHeaders(token?: string): HeadersInit {
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY is not configured");
  }

  return {
    "Content-Type": "application/json",
    apikey: publishableKey,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
