import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ConversationListProps {
  channelType: "student_instructor" | "instructor_admin";
  selectedId: string | null;
  onSelect: (id: string, otherName: string) => void;
}

const ConversationList = ({ channelType, selectedId, onSelect }: ConversationListProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", channelType, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("channel_type", channelType)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("updated_at", { ascending: false });
      if (!data) return [];

      // Fetch other participant profiles and unread counts
      const enriched = await Promise.all(
        data.map(async (conv: any) => {
          const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", otherId)
            .single();
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);
          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, attachment_name")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          return {
            ...conv,
            otherName: profile?.full_name || "Unknown User",
            unread: count || 0,
            lastMessage: lastMsg?.content || (lastMsg?.attachment_name ? "📎 Attachment" : ""),
            lastMessageAt: lastMsg?.created_at || conv.created_at,
          };
        })
      );
      return enriched;
    },
    enabled: !!user,
  });

  // Realtime for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`conv-list-${channelType}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations", channelType, user?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelType, user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv: any) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id, conv.otherName)}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
            selectedId === conv.id ? "bg-primary/5" : ""
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {conv.otherName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{conv.otherName}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(conv.lastMessageAt), "MMM d")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "Start chatting..."}</p>
          </div>
          {conv.unread > 0 && (
            <Badge className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px]">
              {conv.unread}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
};

export default ConversationList;
