import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SiteLayout } from "@/components/site/SiteLayout";
import { getMyRole, adminAddStaff, adminListStaff } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { role } = await getMyRole();
    if (role !== "admin") throw redirect({ to: "/dashboard" });
    return { role };
  },
  head: () => ({
    meta: [
      { title: "Admin Panel — VIROXEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPanel,
});

type StaffTitle = "web_developer" | "researcher" | "designer";

function AdminPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListStaff);
  const addFn = useServerFn(adminAddStaff);

  const staffQ = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => listFn(),
  });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState<StaffTitle>("web_developer");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const addMutation = useMutation({
    mutationFn: () => addFn({ data: { email, name, title, bio } }),
    onSuccess: (res) => {
      setMsg({
        kind: "ok",
        text:
          res.case === "existing"
            ? "Existing user promoted to staff."
            : `Invite sent to ${email}.`,
      });
      setEmail("");
      setName("");
      setBio("");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (err: any) => setMsg({ kind: "err", text: err?.message ?? "Failed" }),
  });

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Admin"
        title="Admin Panel"
        description="Manage staff and internal operations."
      />
      <section className="py-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="text-lg font-semibold">Add staff by email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              If the email already has an account, they'll be promoted to staff. Otherwise
              they'll receive an invite email.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setMsg(null);
                addMutation.mutate();
              }}
            >
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="title">Role / title</Label>
                <Select value={title} onValueChange={(v) => setTitle(v as StaffTitle)}>
                  <SelectTrigger id="title">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_developer">Web Developer</SelectItem>
                    <SelectItem value="researcher">Researcher</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bio">Bio (optional)</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Working…" : "Add staff"}
              </Button>
              {msg && (
                <p
                  className={`text-sm ${
                    msg.kind === "ok" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {msg.text}
                </p>
              )}
            </form>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="text-lg font-semibold">Current staff</h2>
            <div className="mt-4 divide-y divide-border/60">
              {staffQ.isLoading && (
                <p className="py-4 text-sm text-muted-foreground">Loading…</p>
              )}
              {staffQ.data?.staff?.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No staff yet.</p>
              )}
              {staffQ.data?.staff?.map((s: any) => (
                <div key={s.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                  <Badge variant={s.user_id ? "secondary" : "outline"}>
                    {s.user_id ? "active" : "invited"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
