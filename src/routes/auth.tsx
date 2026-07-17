import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — VIROXEN" },
      { name: "description", content: "Sign in or create your VIROXEN account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

type Stage = "form" | "otp" | "forgot";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode);
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: search.redirect ?? "/dashboard" });
    });
  }, [navigate, search.redirect]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function callFn<T = any>(name: string, body: unknown): Promise<{ data: T | null; error: any; status: number }> {
    const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
    // supabase-js exposes context.status via error?.context in v2
    const status = (error as any)?.context?.status ?? (error ? 500 : 200);
    return { data: data as T | null, error, status };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    const parsedPass = passwordSchema.safeParse(password);
    if (!parsedEmail.success) return toast.error(parsedEmail.error.issues[0].message);
    if (!parsedPass.success) return toast.error(parsedPass.error.issues[0].message);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error, status } = await callFn("auth-otp", {
          action: "start",
          email: parsedEmail.data,
          password: parsedPass.data,
          full_name: name || null,
        });
        if (error || (data as any)?.error) {
          const code = (data as any)?.error ?? "failed";
          if (status === 409 || code === "email_taken") throw new Error("An account already exists for this email.");
          throw new Error("Could not send verification code. Please try again.");
        }
        toast.success("We emailed you a 6-digit code.");
        setStage("otp");
        setResendIn(60);
      } else {
        // Signin — check brute-force first
        const check = await callFn<{ locked: boolean; retry_after: number }>("auth-signin-guard", {
          action: "check", email: parsedEmail.data,
        });
        if ((check.data as any)?.locked) {
          const mins = Math.ceil(((check.data as any).retry_after ?? 900) / 60);
          throw new Error(`Too many attempts — try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail.data,
          password: parsedPass.data,
        });
        await callFn("auth-signin-guard", {
          action: "record", email: parsedEmail.data, success: !error,
        });
        if (error) throw error;
        toast.success("Signed in.");
        navigate({ to: search.redirect ?? "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) return toast.error("Enter the 6-digit code");
    setBusy(true);
    try {
      const { data, error } = await callFn("auth-otp", { action: "verify", email, otp });
      if (error || (data as any)?.error) {
        const code = (data as any)?.error;
        if (code === "expired") throw new Error("Code expired — request a new one.");
        if (code === "wrong_code") throw new Error("Incorrect code.");
        throw new Error("Verification failed.");
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) throw signErr;
      toast.success("Account verified. Welcome to VIROXEN.");
      navigate({ to: search.redirect ?? "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (resendIn > 0) return;
    setBusy(true);
    try {
      const { data, error, status } = await callFn("auth-otp", { action: "resend", email });
      if (error || (data as any)?.error) {
        if (status === 429) {
          const s = (data as any)?.retry_after ?? 60;
          setResendIn(s);
          throw new Error(`Please wait ${s}s before requesting another code.`);
        }
        throw new Error("Could not resend code.");
      }
      toast.success("New code sent.");
      setResendIn(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) return toast.error(parsedEmail.error.issues[0].message);
    setBusy(true);
    try {
      await callFn("auth-reset-request", {
        email: parsedEmail.data,
        redirect_to: window.location.origin + "/auth/reset-password",
      });
      toast.success("If that account exists, we've sent a reset link.");
      setStage("form");
    } catch {
      toast.error("Could not send reset email");
    } finally {
      setBusy(false);
    }
  }




  return (
    <SiteLayout>
      <PageHeader
        eyebrow={stage === "otp" ? "Verify email" : stage === "forgot" ? "Reset password" : (mode === "signup" ? "Create account" : "Sign in")}
        title={
          stage === "otp"
            ? "Check your email for a code."
            : stage === "forgot"
              ? "Reset your password."
              : mode === "signup" ? "Create your VIROXEN account." : "Welcome back."
        }
        description={
          stage === "otp"
            ? `Enter the 6-digit code sent to ${email}.`
            : stage === "forgot"
              ? "Enter your email and we'll send a reset link."
              : "Access your audit requests, inquiries, and account settings."
        }
      />
      <section className="py-12">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            {stage === "form" && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "signup" && (
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button type="button" onClick={() => setStage("forgot")} className="text-xs text-muted-foreground hover:text-foreground">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2" />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
                  </Button>
                </form>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {mode === "signup" ? "Already have an account?" : "New to VIROXEN?"}{" "}
                  <button type="button" className="text-primary hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                    {mode === "signup" ? "Sign in" : "Create one"}
                  </button>
                </p>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  By continuing, you agree to our{" "}
                  <Link to="/terms" className="hover:underline">Terms</Link> and{" "}
                  <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
                </p>
              </>
            )}

            {stage === "otp" && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="w-full" disabled={busy || otp.length !== 6} onClick={handleVerify}>
                  {busy ? "Verifying…" : "Verify & continue"}
                </Button>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button type="button" className="hover:text-foreground" onClick={() => setStage("form")}>
                    ← Change email
                  </button>
                  <button type="button" disabled={resendIn > 0 || busy} className="hover:text-foreground disabled:opacity-50" onClick={handleResend}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}

            {stage === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending…" : "Send reset link"}
                </Button>
                <button type="button" onClick={() => setStage("form")} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
                  ← Back to sign in
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
