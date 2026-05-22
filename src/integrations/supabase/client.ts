/**
 * This file previously exported a Supabase client.
 * It now re-exports the Firebase-backed compatibility shim so all existing
 * imports of `supabase` continue to work without any changes in other files.
 */
export { supabase } from "@/integrations/firebase/compat";
