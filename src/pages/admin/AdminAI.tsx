import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const AdminAI = () => {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").limit(1).single();
      return data;
    },
  });

  const [form, setForm] = useState({
    ai_enabled: true,
    ai_model: "gemini",
    ai_detail_level: "detailed",
    ai_max_questions: 10,
    ai_prompt_template: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ai_enabled: settings.ai_enabled ?? true,
        ai_model: settings.ai_model ?? "gemini",
        ai_detail_level: settings.ai_detail_level ?? "detailed",
        ai_max_questions: settings.ai_max_questions ?? 10,
        ai_prompt_template: settings.ai_prompt_template ?? "",
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      const { error } = await supabase.from("platform_settings").update(form).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("AI settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">AI Control Panel</h2>
          <p className="text-sm text-muted-foreground">Configure AI behavior across the platform</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable AI Features</p>
              <p className="text-sm text-muted-foreground">Toggle all AI functionality on/off</p>
            </div>
            <Switch checked={form.ai_enabled} onCheckedChange={(v) => setForm({ ...form, ai_enabled: v })} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">AI Model</label>
            <Select value={form.ai_model} onValueChange={(v) => setForm({ ...form, ai_model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="openai">OpenAI GPT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Explanation Detail Level</label>
            <Select value={form.ai_detail_level} onValueChange={(v) => setForm({ ...form, ai_detail_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Max Questions Per Lesson</label>
            <Input
              type="number"
              value={form.ai_max_questions}
              onChange={(e) => setForm({ ...form, ai_max_questions: parseInt(e.target.value) || 10 })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">AI Prompt Template</label>
            <Textarea
              value={form.ai_prompt_template}
              onChange={(e) => setForm({ ...form, ai_prompt_template: e.target.value })}
              rows={5}
              placeholder="Custom prompt template for math question generation..."
            />
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
            {save.isPending ? "Saving..." : "Save AI Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAI;
