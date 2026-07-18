import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Get the current user's highest role
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) return { role: "user" as const, roles: [] as string[] };
    const roles = (data ?? []).map((r) => r.role as string);
    const role = roles.includes("admin")
      ? "admin"
      : roles.includes("staff") || roles.includes("staff_lead")
      ? "staff"
      : "user";
    return { role, roles };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

// Admin: add staff member by email (case A: existing user, case B: invite new user)
export const adminAddStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        name: z.string().min(1).max(200),
        title: z.enum(["web_developer", "researcher", "designer"]),
        bio: z.string().max(2000).optional().default(""),
      })
      .parse(d),
  )

  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase().trim();

    // Look up existing auth user by email
    let existingUserId: string | null = null;
    {
      const { data: page, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const found = page.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) existingUserId = found.id;
    }

    // Case A — existing account
    if (existingUserId) {
      // Ensure profile row exists
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: existingUserId, email, name: data.name }, { onConflict: "id" });

      // Grant staff role
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: existingUserId, role: "staff" as const },
          { onConflict: "user_id,role" },
        );

      // Create staff row (or update existing)
      const { data: existingStaff } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existingStaff) {
        await supabaseAdmin
          .from("staff")
          .update({
            user_id: existingUserId,
            name: data.name,
            role: data.title,
            bio: data.bio ?? "",
            active: true,
          })
          .eq("id", existingStaff.id);
      } else {
        await supabaseAdmin.from("staff").insert({
          user_id: existingUserId,
          email,
          name: data.name,
          role: data.title,
          bio: data.bio ?? "",
          active: true,
        });
      }
      return { ok: true, case: "existing" as const, message: "Existing user promoted to staff." };
    }

    // Case B — invite new user
    const siteUrl = process.env.SITE_URL || process.env.SUPABASE_URL || "";
    const redirectTo = siteUrl ? `${siteUrl.replace(/\/$/, "")}/auth` : undefined;

    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name: data.name }, redirectTo },
    );
    if (inviteErr || !invited?.user) {
      throw new Error(inviteErr?.message ?? "Failed to send invite");
    }
    const newUserId = invited.user.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, email, name: data.name }, { onConflict: "id" });

    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: newUserId, role: "staff" as const },
        { onConflict: "user_id,role" },
      );

    await supabaseAdmin.from("staff").insert({
      user_id: newUserId,
      email,
      name: data.name,
      role: data.title,
      bio: data.bio ?? "",
      active: true,
    });

    return { ok: true, case: "invited" as const, message: `Invite sent to ${email}.` };
  });

// Admin: list staff
export const adminListStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("id,email,name,role,active,user_id,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { staff: data ?? [] };
  });

// Admin: list all tasks with staff info
export const adminListTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("id,title,description,status,due_date,created_at,staff_id,staff:staff_id(name,email,role)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tasks: data ?? [] };
  });

// Admin: create a task assigned to a staff member
export const adminCreateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      staff_id: z.string().uuid(),
      title: z.string().min(1).max(200),
      description: z.string().max(4000).optional().default(""),
      due_date: z.string().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        staff_id: data.staff_id,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        created_by: context.userId,
      })
      .select("id,staff_id")
      .single();
    if (error) throw new Error(error.message);

    // Notify the assigned staff member (if linked to a user account)
    const { data: staff } = await supabaseAdmin
      .from("staff").select("user_id,name").eq("id", data.staff_id).maybeSingle();
    if (staff?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: staff.user_id,
        kind: "task_assigned",
        title: "New task assigned",
        body: data.title,
        link: "/staff",
      });
    }
    return { ok: true, task };
  });

// Admin: delete a task
export const adminDeleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Admin: list bookings and inquiries
export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { bookings: data ?? [] };
  });

export const adminListInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { inquiries: data ?? [] };
  });

// Staff: update task status on one of their own tasks
export const staffUpdateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["not_started", "in_progress", "done"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // RLS on tasks already scopes to the caller's own staff row
    const { error } = await context.supabase
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Notifications (current user)
export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id,kind,title,body,link,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { notifications: [] };
    return { notifications: data ?? [] };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", context.userId);
    return { ok: true };
  });

