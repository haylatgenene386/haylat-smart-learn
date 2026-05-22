import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, File, ArrowLeft, X, Reply, CornerDownRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ChatWindowProps {
  conversationId: string;
  otherUserName: string;
  onBack?: () => void;
}

interface ReplyTo {
  id: string;
  content: string | null;
  senderName: string;
  attachmentName: string | null;
}

const ChatWindow = ({ conversationId, otherUserName, onBack }: ChatWindowProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!conversationId,
  });

  // Mark unread messages as read
  useEffect(() => {
    if (!user || !messages.length) return;
    const unread = messages.filter((m: any) => m.sender_id !== user.id && !m.is_read);
    if (unread.length > 0) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .in("id", unread.map((m: any) => m.id))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        });
    }
  }, [messages, user]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async ({ content, attachmentUrl, attachmentName, attachmentType, replyToId }: {
      content: string | null; attachmentUrl: string | null; attachmentName: string | null; attachmentType: string | null; replyToId: string | null;
    }) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
        reply_to_id: replyToId,
      } as any);
      if (error) throw error;
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessage("");
      setFile(null);
      setReplyTo(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSend = async () => {
    if (!message.trim() && !file) return;

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let attachmentType: string | null = null;

    if (file) {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (error) {
        toast.error("Failed to upload file");
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(path);
      attachmentUrl = urlData.publicUrl;
      attachmentName = file.name;
      attachmentType = file.type;
      setUploading(false);
    }

    sendMutation.mutate({
      content: message.trim() || null,
      attachmentUrl,
      attachmentName,
      attachmentType,
      replyToId: replyTo?.id || null,
    });
  };

  const isImage = (type: string | null) => type?.startsWith("image/");

  const getReplyPreview = (msgId: string) => {
    const repliedMsg = messages.find((m: any) => m.id === msgId);
    if (!repliedMsg) return null;
    return repliedMsg as any;
  };

  const handleReply = (msg: any) => {
    setReplyTo({
      id: msg.id,
      content: msg.content,
      senderName: msg.sender_id === user?.id ? "You" : otherUserName,
      attachmentName: msg.attachment_name,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {otherUserName.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium">{otherUserName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg: any) => {
          const isMine = msg.sender_id === user?.id;
          const repliedMsg = msg.reply_to_id ? getReplyPreview(msg.reply_to_id) : null;

          return (
            <div key={msg.id} className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
              {/* Reply button (shown on hover, before message if mine) */}
              {isMine && (
                <button
                  onClick={() => handleReply(msg)}
                  className="mr-2 self-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Reply"
                >
                  <Reply className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}

              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                isMine
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}>
                {/* Reply preview */}
                {repliedMsg && (
                  <div className={`mb-2 rounded-lg border-l-2 px-3 py-1.5 text-xs ${
                    isMine
                      ? "border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/80"
                      : "border-primary/40 bg-background/50 text-muted-foreground"
                  }`}>
                    <div className="flex items-center gap-1 font-semibold mb-0.5">
                      <CornerDownRight className="h-3 w-3" />
                      {repliedMsg.sender_id === user?.id ? "You" : otherUserName}
                    </div>
                    <p className="truncate">
                      {repliedMsg.content || (repliedMsg.attachment_name ? `📎 ${repliedMsg.attachment_name}` : "Attachment")}
                    </p>
                  </div>
                )}

                {msg.attachment_url && (
                  <div className="mb-1">
                    {isImage(msg.attachment_type) ? (
                      <img
                        src={msg.attachment_url}
                        alt={msg.attachment_name}
                        className="max-h-48 rounded-lg object-cover cursor-pointer"
                        onClick={() => window.open(msg.attachment_url, "_blank")}
                      />
                    ) : (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 rounded-lg p-2 text-xs ${
                          isMine ? "bg-primary-foreground/10" : "bg-background"
                        }`}
                      >
                        <File className="h-4 w-4 shrink-0" />
                        <span className="truncate">{msg.attachment_name}</span>
                      </a>
                    )}
                  </div>
                )}
                {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                <p className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "h:mm a")}
                </p>
              </div>

              {/* Reply button (shown on hover, after message if not mine) */}
              {!isMine && (
                <button
                  onClick={() => handleReply(msg)}
                  className="ml-2 self-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Reply"
                >
                  <Reply className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/50 px-4 py-2">
          <CornerDownRight className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.content || (replyTo.attachmentName ? `📎 ${replyTo.attachmentName}` : "Attachment")}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyTo(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/50 px-4 py-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 truncate text-sm">{file.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
        />
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0">
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!message.trim() && !file) || sendMutation.isPending || uploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatWindow;
