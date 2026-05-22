
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Eye, Upload, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Section {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  social_links: Record<string, string> | null;
  is_visible: boolean;
  sort_order: number;
}

const AdminAboutUs = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("about_us_content").select("*").order("sort_order");
    if (data) setSections(data as Section[]);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, field: string, value: any) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const updateSocial = (id: string, key: string, value: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, social_links: { ...(s.social_links || {}), [key]: value } } : s
      )
    );
  };

  const handlePhotoUpload = async (sectionId: string, file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      toast.error("Only JPG, PNG, or WebP images are supported");
      return;
    }
    setUploading(true);
    const path = `founder/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("platform-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("platform-assets").getPublicUrl(path);
    update(sectionId, "image_url", urlData.publicUrl);
    setUploading(false);
    toast.success("Photo uploaded");
  };

  const save = async (section: Section) => {
    setSaving(section.id);
    const { error } = await supabase
      .from("about_us_content")
      .update({
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        image_url: section.image_url,
        social_links: section.social_links || {},
        is_visible: section.is_visible,
      })
      .eq("id", section.id);
    setSaving(null);
    if (error) { toast.error("Failed to save"); return; }
    toast.success(`"${section.section_key}" updated`);
  };

  const renderFounderFields = (s: Section) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Founder Name</Label>
          <Input placeholder="Full Name" value={s.title || ""} onChange={(e) => update(s.id, "title", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Title / Role</Label>
          <Input placeholder="e.g. Founder & CEO" value={s.subtitle || ""} onChange={(e) => update(s.id, "subtitle", e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Biography</Label>
        <Textarea placeholder="Short biography..." rows={4} value={s.content || ""} onChange={(e) => update(s.id, "content", e.target.value)} />
      </div>

      {/* Photo upload */}
      <div>
        <Label className="text-xs text-muted-foreground">Founder Photo</Label>
        <div className="flex items-center gap-4 mt-1">
          {s.image_url ? (
            <img src={s.image_url} alt="Founder" className="w-16 h-16 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No photo</div>
          )}
          <div className="flex-1 space-y-1">
            <Input placeholder="Image URL (or upload below)" value={s.image_url || ""} onChange={(e) => update(s.id, "image_url", e.target.value)} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => e.target.files?.[0] && handlePhotoUpload(s.id, e.target.files[0])} />
            <Button type="button" variant="outline" size="sm" className="gap-1" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">LinkedIn URL</Label>
          <Input placeholder="https://linkedin.com/in/..." value={s.social_links?.linkedin || ""} onChange={(e) => updateSocial(s.id, "linkedin", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Telegram URL</Label>
          <Input placeholder="https://t.me/..." value={s.social_links?.telegram || ""} onChange={(e) => updateSocial(s.id, "telegram", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Website URL</Label>
          <Input placeholder="https://..." value={s.social_links?.website || ""} onChange={(e) => updateSocial(s.id, "website", e.target.value)} />
        </div>
      </div>
    </>
  );

  const renderDefaultFields = (s: Section) => (
    <>
      <Input placeholder="Title" value={s.title || ""} onChange={(e) => update(s.id, "title", e.target.value)} />
      <Textarea placeholder="Content" rows={4} value={s.content || ""} onChange={(e) => update(s.id, "content", e.target.value)} />
      <Input placeholder="Image URL (optional)" value={s.image_url || ""} onChange={(e) => update(s.id, "image_url", e.target.value)} />
    </>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">About Us Content</h1>
        <Link to="/about-us" target="_blank">
          <Button variant="outline" size="sm" className="gap-1"><Eye className="h-4 w-4" /> Preview</Button>
        </Link>
      </div>
      <div className="space-y-6">
        {sections.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg capitalize">{s.section_key.replace("_", " ")}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Visible</span>
                <Switch checked={s.is_visible} onCheckedChange={(v) => update(s.id, "is_visible", v)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.section_key === "founder" ? renderFounderFields(s) : renderDefaultFields(s)}
              <Button size="sm" className="gap-1" disabled={saving === s.id} onClick={() => save(s)}>
                <Save className="h-4 w-4" /> {saving === s.id ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminAboutUs;
