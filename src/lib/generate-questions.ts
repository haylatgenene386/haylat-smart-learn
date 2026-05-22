export type AIQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  alternative_method?: string;
};

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`;

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
  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ topic, grade, count, difficulty }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  return data.questions;
}
