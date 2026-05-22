import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, CheckCircle2, XCircle } from "lucide-react";

const AdminEmailLogs = () => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });

  const sent = logs.filter((l) => l.status === "sent").length;
  const failed = logs.filter((l) => l.status === "failed").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Email Logs</h1>
          <p className="text-muted-foreground text-sm">Delivery history of automated platform emails.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex gap-2 items-center"><Mail className="h-4 w-4" /> Total</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{logs.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex gap-2 items-center text-green-600"><CheckCircle2 className="h-4 w-4" /> Sent</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{sent}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex gap-2 items-center text-destructive"><XCircle className="h-4 w-4" /> Failed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{failed}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent emails</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{l.email_type}</Badge></TableCell>
                        <TableCell className="text-xs">{l.recipient}</TableCell>
                        <TableCell className="text-xs max-w-md truncate" title={l.subject}>{l.subject}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "sent" ? "default" : "destructive"}>{l.status}</Badge>
                          {l.error_message && (
                            <p className="text-[10px] text-destructive mt-1 max-w-xs truncate" title={l.error_message}>{l.error_message}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminEmailLogs;
