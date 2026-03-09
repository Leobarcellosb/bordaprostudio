import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Subscription {
  id: string;
  email: string;
  plan_code: string;
  status: string;
  provider_buyer_id: string | null;
  provider_invoice_id: string | null;
  access_expires_at: string | null;
  last_event: string | null;
  created_at: string;
}

export const AdminSubscriptions = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await db
        .from("subscriptions")
        .select("id, email, plan_code, status, provider_buyer_id, provider_invoice_id, access_expires_at, last_event, created_at")
        .order("created_at", { ascending: false });
      setSubs(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const statusColor = (s: string) => {
    if (s === "active") return "default";
    if (s === "pending") return "secondary";
    return "destructive";
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!subs.length) return <p className="text-center text-muted-foreground py-12">Nenhuma assinatura encontrada.</p>;

  return (
    <div className="rounded-lg border border-border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Buyer ID</TableHead>
            <TableHead>Invoice ID</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Último evento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium text-sm">{s.email}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{s.plan_code}</Badge></TableCell>
              <TableCell><Badge variant={statusColor(s.status)} className="capitalize">{s.status}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.provider_buyer_id || "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.provider_invoice_id || "—"}</TableCell>
              <TableCell className="text-xs">
                {s.access_expires_at ? new Date(s.access_expires_at).toLocaleDateString("pt-BR") : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.last_event || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
