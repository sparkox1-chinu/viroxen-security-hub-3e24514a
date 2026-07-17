import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, SiteLayout } from "@/components/site/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  ssr: false,
  beforeLoad: async () => {
    const { role } = await getMyRole();
    if (role !== "staff" && role !== "admin") throw redirect({ to: "/dashboard" });
    return { role };
  },
  head: () => ({
    meta: [
      { title: "Staff Panel — VIROXEN" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPanel,
});

function StaffPanel() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: staff } = await supabase
        .from("staff")
        .select("id,name,role,email")
        .eq("user_id", u.user.id)
        .maybeSingle();
      setMe(staff);
      const { data: t } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      setTasks(t ?? []);
    })();
  }, []);

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Staff"
        title="Staff Panel"
        description="Your assigned tasks and workspace."
      />
      <section className="py-12">
        <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
          {me && (
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="mt-1 font-medium">
                {me.name} <span className="text-muted-foreground">— {me.role}</span>
              </p>
            </div>
          )}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Tasks</h2>
            {tasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                No tasks assigned.
              </p>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      {t.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
