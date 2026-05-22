import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const AdminSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").limit(1).single();
      return data;
    },
  });

  const [form, setForm] = useState({
    platform_name: "Haylat_EdTech",
    slogan: "",
    theme_color: "#6366f1",
    dark_mode: false,
    footer_text: "",
    contact_email: "",
    low_data_mode: false,
    default_language: "en",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        platform_name: settings.platform_name ?? "Haylat_EdTech",
        slogan: settings.slogan ?? "",
        theme_color: settings.theme_color ?? "#6366f1",
        dark_mode: settings.dark_mode ?? false,
        footer_text: settings.footer_text ?? "",
        contact_email: settings.contact_email ?? "",
        low_data_mode: settings.low_data_mode ?? false,
        default_language: settings.default_language ?? "en",
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
      toast.success("Settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Platform Settings</h2>
          <p className="text-sm text-muted-foreground">Manage branding, appearance, and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Branding */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="font-display font-semibold">Branding</h3>
            <div>
              <label className="mb-1 block text-sm font-medium">Platform Name</label>
              <Input value={form.platform_name} onChange={(e) => setForm({ ...form, platform_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Slogan</label>
              <Input value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Theme Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.theme_color}
                  onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                  className="h-10 w-10 cursor-pointer rounded border-0"
                />
                <Input value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="flex-1" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Footer Text</label>
              <Textarea value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contact Email</label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <h3 className="font-display font-semibold">Preferences</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Enable dark theme</p>
              </div>
              <Switch checked={form.dark_mode} onCheckedChange={(v) => setForm({ ...form, dark_mode: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Low Data Mode</p>
                <p className="text-xs text-muted-foreground">Optimized for slow connections</p>
              </div>
              <Switch checked={form.low_data_mode} onCheckedChange={(v) => setForm({ ...form, low_data_mode: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Default Language</p>
                <p className="text-xs text-muted-foreground">English or Amharic</p>
              </div>
              <select
                value={form.default_language}
                onChange={(e) => setForm({ ...form, default_language: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="en">English</option>
                <option value="am">አማርኛ (Amharic)</option>
              </select>
            </div>
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
            {save.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
