import { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConversationList from "@/components/ConversationList";
import ChatWindow from "@/components/ChatWindow";
import NewConversationDialog from "@/components/NewConversationDialog";
import { MessageCircle } from "lucide-react";

const Messages = () => {
  const { role } = useAuth();
  const [selectedConv, setSelectedConv] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (role === "student") return "student_instructor";
    if (role === "instructor") return "student_instructor";
    return "instructor_admin";
  });

  const showStudentInstructor = role === "student" || role === "instructor";
  const showInstructorAdmin = role === "instructor" || role === "admin" || role === "super_admin";

  const handleSelect = (id: string, name: string) => {
    setSelectedConv({ id, name });
  };

  const channelType = activeTab as "student_instructor" | "instructor_admin";

  return (
    <Layout>
      <div className="container py-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">Chat with your {role === "student" ? "instructors" : role === "instructor" ? "students & admins" : "instructors"}</p>
          </div>
        </div>

        <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {/* Sidebar */}
          <div className={`flex flex-col border-r border-border ${selectedConv ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0`}>
            {/* Channel tabs */}
            {showStudentInstructor && showInstructorAdmin ? (
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedConv(null); }} className="w-full">
                <div className="border-b border-border p-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="student_instructor" className="flex-1 text-xs">
                      {role === "instructor" ? "Students" : "Instructors"}
                    </TabsTrigger>
                    <TabsTrigger value="instructor_admin" className="flex-1 text-xs">
                      {role === "instructor" ? "Admin" : "Instructors"}
                    </TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>
            ) : (
              <div className="border-b border-border p-3">
                <span className="text-sm font-medium">
                  {channelType === "student_instructor" ? (role === "student" ? "Instructors" : "Students") : ((role as string) === "instructor" ? "Admin" : "Instructors")}
                </span>
              </div>
            )}

            <div className="border-b border-border p-2 flex justify-end">
              <NewConversationDialog channelType={channelType} onCreated={handleSelect} />
            </div>

            <div className="flex-1 overflow-y-auto">
              <ConversationList
                channelType={channelType}
                selectedId={selectedConv?.id ?? null}
                onSelect={handleSelect}
              />
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 ${selectedConv ? "flex" : "hidden md:flex"} flex-col`}>
            {selectedConv ? (
              <ChatWindow
                conversationId={selectedConv.id}
                otherUserName={selectedConv.name}
                onBack={() => setSelectedConv(null)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Messages;
