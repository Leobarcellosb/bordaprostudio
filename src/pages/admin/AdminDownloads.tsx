import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const AdminDownloads = () => {
  const [downloads, setDownloads] = useState<any[]>([]);

  useEffect(() => {
    db.from("downloads").select("*, designs(title), profiles:user_id(name, email)").order("downloaded_at", { ascending: false }).limit(100).then(({ data }: any) => setDownloads(data || []));
  }, []);

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-3">Downloads Recentes</h3>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Design</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
          <TableBody>{downloads.map((dl: any) => (
            <TableRow key={dl.id}>
              <TableCell><p className="font-medium text-sm">{dl.profiles?.name || "—"}</p><p className="text-xs text-muted-foreground">{dl.profiles?.email}</p></TableCell>
              <TableCell>{dl.designs?.title || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(dl.downloaded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
    </div>
  );
};
