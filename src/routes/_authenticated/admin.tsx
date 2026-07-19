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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SiteLayout } from "@/components/site/SiteLayout";
import {
  getMyRole,
  adminAddStaff,
  adminListStaff,
  adminListTasks,
  adminCreateTask,
  adminDeleteTask,
  adminListBookings,
  adminListInquiries,
} from "@/lib/admin.functions";

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
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Admin"
        title="Admin Panel"
        description="Manage staff, tasks, bookings, inquiries."
      />
      <section className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="staff" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            </TabsList>
            <TabsContent value="staff" className="mt-6"><StaffTab /></TabsContent>
            <TabsContent value="tasks" className="mt-6"><TasksTab /></TabsContent>
            <TabsContent value="bookings" className="mt-6"><BookingsTab /></TabsContent>
            <TabsContent value="inquiries" className="mt-6"><InquiriesTab /></TabsContent>
          </Tabs>
        </div>
      </section>
    </SiteLayout>
  );
}

function StaffTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListStaff);
  const addFn = useServerFn(adminAddStaff);
  const staffQ = useQuery({ queryKey: ["admin", "staff"], queryFn: () => listFn() });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState<StaffTitle>("web_developer");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const addMutation = useMutation({
    mutationFn: () => addFn({ data: { email, name, title, bio } }),
    onSuccess: (res) => {
      setMsg({ kind: "ok", text: res.case === "existing" ? "Existing user promoted to staff." : `Invite sent to ${email}.` });
      setEmail(""); setName(""); setBio("");
      qc.invalidateQueries({ queryKey: ["admin", "staff"] });
    },
    onError: (err: any) => setMsg({ kind: "err", text: err?.message ?? "Failed" }),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">Add staff by email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Existing users are promoted to staff. New emails get an invite.
        </p>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setMsg(null); addMutation.mutate(); }}>
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="name">Full name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label htmlFor="title">Role / title</Label>
            <Select value={title} onValueChange={(v) => setTitle(v as StaffTitle)}>
              <SelectTrigger id="title"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="web_developer">Web Developer</SelectItem>
                <SelectItem value="researcher">Researcher</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="bio">Bio (optional)</Label><Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Working…" : "Add staff"}
          </Button>
          {msg && <p className={`text-sm ${msg.kind === "ok" ? "text-green-500" : "text-red-500"}`}>{msg.text}</p>}
        </form>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">Current staff</h2>
        <div className="mt-4 divide-y divide-border/60">
          {staffQ.isLoading && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
          {staffQ.data?.staff?.length === 0 && <p className="py-4 text-sm text-muted-foreground">No staff yet.</p>}
          {staffQ.data?.staff?.map((s: any) => (
            <div key={s.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.email}</p>
                <p className="text-xs text-muted-foreground">{s.role}</p>
              </div>
              <Badge variant={s.user_id ? "secondary" : "outline"}>{s.user_id ? "active" : "invited"}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TasksTab() {
  const qc = useQueryClient();
  const listStaffFn = useServerFn(adminListStaff);
  const listTasksFn = useServerFn(adminListTasks);
  const createFn = useServerFn(adminCreateTask);
  const deleteFn = useServerFn(adminDeleteTask);

  const staffQ = useQuery({ queryKey: ["admin", "staff"], queryFn: () => listStaffFn() });
  const tasksQ = useQuery({ queryKey: ["admin", "tasks"], queryFn: () => listTasksFn() });

  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { staff_id: staffId, title, description, due_date: dueDate || null } }),
    onSuccess: () => {
      setMsg({ kind: "ok", text: "Task assigned." });
      setTitle(""); setDescription(""); setDueDate("");
      qc.invalidateQueries({ queryKey: ["admin", "tasks"] });
    },
    onError: (err: any) => setMsg({ kind: "err", text: err?.message ?? "Failed" }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tasks"] }),
    onError: (err: any) => alert(`Delete failed: ${err?.message ?? "unknown"}`),
  });

  const activeStaff = (staffQ.data?.staff ?? []).filter((s: any) => s.active);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">Assign a task</h2>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setMsg(null); if (!staffId) return setMsg({ kind: "err", text: "Pick a staff member" }); createMut.mutate(); }}>
          <div>
            <Label>Assign to</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
              <SelectContent>
                {activeStaff.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="tt">Title</Label><Input id="tt" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label htmlFor="td">Description</Label><Textarea id="td" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label htmlFor="dd">Due date (optional)</Label><Input id="dd" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <Button type="submit" disabled={createMut.isPending}>
            {createMut.isPending ? "Assigning…" : "Assign task"}
          </Button>
          {msg && <p className={`text-sm ${msg.kind === "ok" ? "text-green-500" : "text-red-500"}`}>{msg.text}</p>}
        </form>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">All tasks</h2>
        <div className="mt-4 divide-y divide-border/60">
          {tasksQ.isLoading && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
          {tasksQ.data?.tasks?.length === 0 && <p className="py-4 text-sm text-muted-foreground">No tasks yet.</p>}
          {tasksQ.data?.tasks?.map((t: any) => (
            <div key={t.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  → {t.staff?.name ?? "unassigned"}{t.due_date ? ` · due ${t.due_date}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">{t.status}</Badge>
                <button className="text-xs text-red-500 hover:underline" onClick={() => delMut.mutate(t.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingsTab() {
  const listFn = useServerFn(adminListBookings);
  const q = useQuery({ queryKey: ["admin", "bookings"], queryFn: () => listFn() });
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h2 className="text-lg font-semibold">Recent audit bookings</h2>
      <div className="mt-4 divide-y divide-border/60">
        {q.isLoading && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
        {q.data?.bookings?.length === 0 && <p className="py-4 text-sm text-muted-foreground">No bookings yet.</p>}
        {q.data?.bookings?.map((b: any) => (
          <div key={b.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="font-medium">{b.name} <span className="text-xs text-muted-foreground">· {b.email}</span></p>
              <p className="text-xs text-muted-foreground">{b.company ?? "—"} · {b.plan_name}</p>
              {b.scope_summary && <p className="mt-1 text-sm text-muted-foreground">{b.scope_summary}</p>}
              {b.timeline && <p className="text-xs text-muted-foreground">Timeline: {b.timeline}</p>}
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary">{b.status}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InquiriesTab() {
  const listFn = useServerFn(adminListInquiries);
  const q = useQuery({ queryKey: ["admin", "inquiries"], queryFn: () => listFn() });
  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h2 className="text-lg font-semibold">Recent inquiries</h2>
      <div className="mt-4 divide-y divide-border/60">
        {q.isLoading && <p className="py-4 text-sm text-muted-foreground">Loading…</p>}
        {q.data?.inquiries?.length === 0 && <p className="py-4 text-sm text-muted-foreground">No inquiries yet.</p>}
        {q.data?.inquiries?.map((i: any) => (
          <div key={i.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="font-medium">{i.name} <span className="text-xs text-muted-foreground">· {i.email}</span></p>
              <p className="text-xs text-muted-foreground">{i.company ?? "—"}{i.service_type ? ` · ${i.service_type}` : ""}</p>
              <p className="mt-1 text-sm text-muted-foreground">{i.message}</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary">{i.status}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
