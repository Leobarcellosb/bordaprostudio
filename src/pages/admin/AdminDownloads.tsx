import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const AdminDownloads = () => {
  const [downloads, setDownloads] = useState<any[]>([]);

  useEffect(() => {
    const fetchDownloads = async () => {
      const { data } = await supabase.from("downloads").select("*, kits(name), profiles:user_id(full_name, email)").order("downloaded_at", { ascending: false }).limit(100);
      setDownloads(data || []);
    };
    fetchDownloads();
  }, []);

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-3">Downloads Recentes</h3>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Design</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {downloads.map(dl => (
              <TableRow key={dl.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{(dl.profiles as any)?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{(dl.profiles as any)?.email}</p>
                  </div>
                </TableCell>
                <TableCell>{dl.kits?.name || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(dl.downloaded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
