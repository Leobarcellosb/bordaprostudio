import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ImagePlus, Lightbulb, ThumbsUp, MessageSquare, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CommunityPost {
  id: string;
  user_id: string;
  image_url: string;
  comment: string | null;
  design_name: string | null;
  created_at: string;
  user_name?: string;
  avatar_url?: string;
}

interface MatrixRequest {
  id: string;
  user_id: string;
  theme: string;
  category: string | null;
  comment: string | null;
  votes_count: number;
  created_at: string;
  user_name?: string;
  voted?: boolean;
}

const CommunityPage = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [requests, setRequests] = useState<MatrixRequest[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Post form state
  const [postOpen, setPostOpen] = useState(false);
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postComment, setPostComment] = useState("");
  const [postDesignName, setPostDesignName] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postPreview, setPostPreview] = useState<string | null>(null);

  // Request form state
  const [reqOpen, setReqOpen] = useState(false);
  const [reqTheme, setReqTheme] = useState("");
  const [reqCategory, setReqCategory] = useState("");
  const [reqComment, setReqComment] = useState("");
  const [reqSubmitting, setReqSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchRequests();
  }, [user]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    const { data } = await db
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profiles } = await db
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setPosts(
        data.map((p: any) => {
          const prof = profileMap.get(p.user_id) as any;
          return {
            ...p,
            user_name: prof?.name || "Usuária",
            avatar_url: prof?.avatar_url,
        }))
      );
    } else {
      setPosts([]);
    }
    setLoadingPosts(false);
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    const { data } = await db
      .from("matrix_requests")
      .select("*")
      .order("votes_count", { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await db
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setRequests(
        data.map((r: any) => ({
          ...r,
          user_name: profileMap.get(r.user_id)?.name || "Usuária",
        }))
      );
    } else {
      setRequests([]);
    }

    // Fetch user votes
    if (user) {
      const { data: votes } = await db
        .from("matrix_request_votes")
        .select("request_id")
        .eq("user_id", user.id);
      setUserVotes(new Set((votes || []).map((v: any) => v.request_id)));
    }

    setLoadingRequests(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostFile(file);
      setPostPreview(URL.createObjectURL(file));
    }
  };

  const handlePostSubmit = async () => {
    if (!postFile || !user) return;
    setPostSubmitting(true);

    try {
      const ext = postFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("community-photos")
        .upload(path, postFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("community-photos")
        .getPublicUrl(path);

      await db.from("community_posts").insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        comment: postComment || null,
        design_name: postDesignName || null,
      });

      toast({ title: "Bordado publicado!", description: "Sua foto foi compartilhada com a comunidade." });
      setPostOpen(false);
      setPostFile(null);
      setPostPreview(null);
      setPostComment("");
      setPostDesignName("");
      fetchPosts();
    } catch (err: any) {
      toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" });
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!reqTheme.trim() || !user) return;
    setReqSubmitting(true);

    try {
      await db.from("matrix_requests").insert({
        user_id: user.id,
        theme: reqTheme.trim(),
        category: reqCategory || null,
        comment: reqComment || null,
      });

      toast({ title: "Pedido enviado!", description: "Sua sugestão foi registrada." });
      setReqOpen(false);
      setReqTheme("");
      setReqCategory("");
      setReqComment("");
      fetchRequests();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setReqSubmitting(false);
    }
  };

  const handleVote = async (requestId: string) => {
    if (!user) return;
    const hasVoted = userVotes.has(requestId);

    try {
      if (hasVoted) {
        await db
          .from("matrix_request_votes")
          .delete()
          .eq("user_id", user.id)
          .eq("request_id", requestId);
        setUserVotes((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      } else {
        await db.from("matrix_request_votes").insert({
          user_id: user.id,
          request_id: requestId,
        });
        setUserVotes((prev) => new Set(prev).add(requestId));
      }
      fetchRequests();
    } catch {
      toast({ title: "Erro ao votar", variant: "destructive" });
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunidade</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Compartilhe seus bordados e peça novas matrizes
          </p>
        </div>

        <Tabs defaultValue="bordados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bordados" className="gap-2">
              <Camera className="h-4 w-4" />
              Bordados
            </TabsTrigger>
            <TabsTrigger value="pedidos" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Pedir Matrizes
            </TabsTrigger>
          </TabsList>

          {/* ── BORDADOS TAB ── */}
          <TabsContent value="bordados" className="space-y-4 mt-4">
            <Dialog open={postOpen} onOpenChange={setPostOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Postar meu bordado
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Compartilhar bordado</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Foto do bordado *</Label>
                    <Input type="file" accept="image/*" onChange={handleFileChange} className="mt-1" />
                    {postPreview && (
                      <img src={postPreview} alt="Preview" className="mt-2 rounded-lg max-h-48 w-full object-cover" />
                    )}
                  </div>
                  <div>
                    <Label>Comentário</Label>
                    <Textarea
                      placeholder="Conte sobre seu bordado..."
                      value={postComment}
                      onChange={(e) => setPostComment(e.target.value)}
                      className="mt-1"
                      maxLength={500}
                    />
                  </div>
                  <div>
                    <Label>Nome da matriz usada (opcional)</Label>
                    <Input
                      placeholder="Ex: Floral Delicado"
                      value={postDesignName}
                      onChange={(e) => setPostDesignName(e.target.value)}
                      className="mt-1"
                      maxLength={100}
                    />
                  </div>
                  <Button onClick={handlePostSubmit} disabled={!postFile || postSubmitting} className="w-full">
                    {postSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Publicar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {loadingPosts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum bordado compartilhado ainda.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Seja a primeira a postar!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {posts.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    <img
                      src={post.image_url}
                      alt="Bordado"
                      className="w-full h-52 object-cover"
                      loading="lazy"
                    />
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        {post.avatar_url ? (
                          <img src={post.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
                            {(post.user_name || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-foreground">{post.user_name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.created_at)}</span>
                      </div>
                      {post.comment && (
                        <p className="text-sm text-foreground/80">{post.comment}</p>
                      )}
                      {post.design_name && (
                        <Badge variant="secondary" className="text-xs">
                          Matriz: {post.design_name}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── PEDIDOS TAB ── */}
          <TabsContent value="pedidos" className="space-y-4 mt-4">
            <Dialog open={reqOpen} onOpenChange={setReqOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Sugerir nova matriz
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Pedir nova matriz</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tema da matriz *</Label>
                    <Input
                      placeholder="Ex: Flores tropicais, Personagens infantis..."
                      value={reqTheme}
                      onChange={(e) => setReqTheme(e.target.value)}
                      className="mt-1"
                      maxLength={150}
                    />
                  </div>
                  <div>
                    <Label>Categoria (opcional)</Label>
                    <Input
                      placeholder="Ex: Floral, Infantil, Geométrico..."
                      value={reqCategory}
                      onChange={(e) => setReqCategory(e.target.value)}
                      className="mt-1"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <Label>Comentário (opcional)</Label>
                    <Textarea
                      placeholder="Descreva melhor o que você precisa..."
                      value={reqComment}
                      onChange={(e) => setReqComment(e.target.value)}
                      className="mt-1"
                      maxLength={500}
                    />
                  </div>
                  <Button onClick={handleRequestSubmit} disabled={!reqTheme.trim() || reqSubmitting} className="w-full">
                    {reqSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enviar pedido
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {loadingRequests ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum pedido de matriz ainda.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Sugira um tema!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                  Pedidos mais votados
                </h3>
                {requests.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Button
                        variant={userVotes.has(req.id) ? "default" : "outline"}
                        size="sm"
                        className="flex flex-col items-center px-3 py-2 h-auto min-w-[50px] shrink-0"
                        onClick={() => handleVote(req.id)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span className="text-xs mt-0.5">{req.votes_count}</span>
                      </Button>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium text-foreground">{req.theme}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {req.category && (
                            <Badge variant="secondary" className="text-xs">{req.category}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            por {req.user_name} · {timeAgo(req.created_at)}
                          </span>
                        </div>
                        {req.comment && (
                          <p className="text-xs text-muted-foreground">{req.comment}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CommunityPage;
