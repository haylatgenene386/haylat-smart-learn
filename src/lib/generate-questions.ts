import { auth } from "@/integrations/firebase/client";
import { getSupabaseFunctionHeaders, getSupabaseFunctionUrl } from "@/lib/supabase-functions";

export type AIQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  alternative_method?: string;
};

export async function generateQuestions({
  topic,
  grade,
  count = 5,
  difficulty = "medium",
}: {
  topic: string;
  grade: number;
  count?: number;
  difficulty?: string;
}): Promise<AIQuestion[]> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : "";

  const resp = await fetch(getSupabaseFunctionUrl("generate-questions"), {
    method: "POST",
    headers: getSupabaseFunctionHeaders(token),
    body: JSON.stringify({ topic, grade, count, difficulty }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  return data.questions;
}
