import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquarePlus, Search } from "lucide-react";
import { toast } from "sonner";

interface Props {
  channelType: "student_instructor" | "instructor_admin";
  onCreated: (convId: string, otherName: string) => void;
}

const NewConversationDialog = ({ channelType, onCreated }: Props) => {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // Determine which users to show
  // student_instructor: students see instructors, instructors see students
  // instructor_admin: instructors see admins, admins see instructors
  const targetRole = (() => {
    if (channelType === "student_instructor") {
      if (role === "student") return "instructor";
      return "student";
    }
    if (channelType === "instructor_admin") {
      if (role === "instructor") return "super_admin";
      return "instructor";
    }
    return "student";
  })();

  const { data: users = [] } = useQuery({
    queryKey: ["chat-users", targetRole],
    queryFn: async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", targetRole);
      if (!roleRows?.length) return [];
      const ids = roleRows.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      return profiles ?? [];
    },
    enabled: open,
  });

  const filtered = users.filter((u: any) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const startConversation = async (otherUserId: string, otherName: string) => {
    if (!user) return;
    setCreating(true);
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("channel_type", channelType)
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`
        )
        .limit(1)
        .single();

      if (existing) {
        onCreated(existing.id, otherName);
        setOpen(false);
        return;
      }

      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant_1: user.id,
          participant_2: otherUserId,
          channel_type: channelType,
        })
        .select("id")
        .single();

      if (error) throw error;
      onCreated(newConv.id, otherName);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create conversation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" /> New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-9"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No users found
            </div>
          ) : (
            filtered.map((u: any) => (
              <button
                key={u.user_id}
                disabled={creating}
                onClick={() => startConversation(u.user_id, u.full_name || "Unknown")}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(u.full_name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{targetRole.replace("_", " ")}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
