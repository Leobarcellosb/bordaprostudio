import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, Search, MoreHorizontal, Users, ShieldCheck, UserCog, ToggleLeft, ToggleRight, Settings2 } from "lucide-react";
import { MACHINE_FORMATS, MACHINE_HOOP_SIZES } from "@/hooks/useUserMachineSettings";

interface UserRow {
  id: string;
  name: string | null;
  last_name: string | null;
  email: string | null;
  plan: string | null;
  machine_format: string | null;
  machine_hoop_size: string | null;
  created_at: string | null;
  user_roles: { role: string }[];
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", last_name: "", email: "", password: "", plan: "basic", role: "user" });

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", last_name: "", plan: "", role: "", machine_format: "", machine_hoop_size: "" });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await db
        .from("profiles")
        .select("id, name, last_name, email, plan, machine_format, machine_hoop_size, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("[AdminUsers] profiles query error:", profilesError);
        setLoading(false);
        return;
      }

      const { data: rolesData, error: rolesError } = await db
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        console.error("[AdminUsers] user_roles query error:", rolesError);
      }

      const rolesMap: Record<string, { role: string }[]> = {};
      (rolesData || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push({ role: r.role });
      });

      const merged = (profilesData || []).map((p: any) => ({
        ...p,
        user_roles: rolesMap[p.id] || [],
      }));

      setUsers(merged);
    } catch (err) {
      console.error("[AdminUsers] unexpected error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const callAdmin = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("admin-manage-user", {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.name) {
      toast.error("Preencha nome, email e senha.");
      return;
    }
    setCreating(true);
    try {
      await callAdmin({ action: "create", ...form });
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setForm({ name: "", last_name: "", email: "", password: "", plan: "basic", role: "user" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    }
    setCreating(false);
  };

  const handleEditOpen = (u: UserRow) => {
    setEditUser(u);
    setEditForm({
      name: u.name || "",
      last_name: u.last_name || "",
      plan: u.plan || "basic",
      role: u.user_roles?.[0]?.role || "user",
      machine_format: u.machine_format || "",
      machine_hoop_size: u.machine_hoop_size || "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await db.from("profiles").update({
        name: editForm.name,
        last_name: editForm.last_name,
        plan: editForm.plan,
        machine_format: editForm.machine_format || null,
        machine_hoop_size: editForm.machine_hoop_size || null,
      }).eq("id", editUser.id);

      const currentRole = editUser.user_roles?.[0]?.role;
      if (currentRole !== editForm.role) {
        await callAdmin({ action: "update_role", user_id: editUser.id, role: editForm.role });
      }
      toast.success("Usuário atualizado!");
      setEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
    setSaving(false);
  };

  const handleChangePlan = async (userId: string, plan: string) => {
    try {
      await callAdmin({ action: "update_plan", user_id: userId, plan });
      toast.success("Plano alterado!");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await callAdmin({ action: "update_role", user_id: userId, role });
      toast.success("Papel alterado!");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleBan = async (userId: string, ban: boolean) => {
    try {
      await callAdmin({ action: "toggle_ban", user_id: userId, ban });
      toast.success(ban ? "Usuário desativado" : "Usuário ativado");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.last_name || "").toLowerCase().includes(q);
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    const userRole = u.user_roles?.[0]?.role || "user";
    const matchRole = filterRole === "all" || userRole === filterRole;
    return matchSearch && matchPlan && matchRole;
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-lg">Usuários ({users.length})</h3>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo usuário
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Papel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg border-dashed border-border">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium mb-1">Nenhum usuário encontrado</p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            {search || filterPlan !== "all" || filterRole !== "all" ? "Tente ajustar os filtros." : "Crie o primeiro usuário para começar."}
          </p>
          {!search && filterPlan === "all" && filterRole === "all" && (
            <Button onClick={() => setCreateOpen(true)} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Criar primeiro usuário
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Bastidor</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const role = u.user_roles?.[0]?.role || "user";
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{[u.name, u.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      {u.machine_format ? (
                        <Badge variant="outline" className="text-xs">{u.machine_format}</Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      {u.machine_hoop_size ? (
                        <Badge variant="outline" className="text-xs">{u.machine_hoop_size}</Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{u.plan || "basic"}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={role === "admin" ? "default" : "outline"} className="capitalize">{role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditOpen(u)}>
                            <UserCog className="h-4 w-4 mr-2" /> Editar usuário
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangePlan(u.id, u.plan === "anual" ? "mensal" : "anual")}>
                            <ToggleLeft className="h-4 w-4 mr-2" /> Alterar plano
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(u.id, role === "admin" ? "user" : "admin")}>
                            <ShieldCheck className="h-4 w-4 mr-2" /> {role === "admin" ? "Remover admin" : "Tornar admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleBan(u.id, true)} className="text-destructive">
                            <ToggleRight className="h-4 w-4 mr-2" /> Desativar acesso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create User Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sobrenome</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha temporária</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Sem plano</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sobrenome</Label>
                <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={editForm.plan} onValueChange={(v) => setEditForm({ ...editForm, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Sem plano</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Papel</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Machine Settings - Admin only */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Configurações da Máquina</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Formato</Label>
                  <Select value={editForm.machine_format} onValueChange={(v) => setEditForm({ ...editForm, machine_format: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {MACHINE_FORMATS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bastidor</Label>
                  <Select value={editForm.machine_hoop_size} onValueChange={(v) => setEditForm({ ...editForm, machine_hoop_size: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {MACHINE_HOOP_SIZES.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
