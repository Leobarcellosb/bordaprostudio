import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    db.from("profiles").select("*, user_roles(role)").then(({ data }: any) => setUsers(data || []));
  }, []);

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-3">Usuários ({users.length})</h3>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Plano</TableHead><TableHead>Papel</TableHead><TableHead>Cadastro</TableHead></TableRow></TableHeader>
          <TableBody>{users.map((u: any) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell><Badge variant="secondary" className="capitalize">{u.plan}</Badge></TableCell>
              <TableCell>{(u.user_roles || []).map((r: any) => <Badge key={r.role} variant={r.role === "admin" ? "default" : "outline"} className="mr-1">{r.role}</Badge>)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
    </div>
  );
};
