"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Terminal, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"enter-email" | "enter-otp">("enter-email");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Magic link sent — check your inbox.");
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStage("enter-otp");
    toast.success("Code sent to your email.");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.location.href = next;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">ZTE Tracker</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Zero to Elite — daily execution tracker.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="magic-link">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="magic-link" className="flex-1">Magic link</TabsTrigger>
                <TabsTrigger value="otp" className="flex-1">Email code</TabsTrigger>
              </TabsList>

              <TabsContent value="magic-link">
                <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send magic link
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="otp">
                {stage === "enter-email" ? (
                  <form onSubmit={sendOtp} className="flex flex-col gap-3">
                    <Input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Send code
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={verifyOtp} className="flex flex-col gap-3">
                    <Input
                      required
                      inputMode="numeric"
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Verify & sign in
                    </Button>
                    <button
                      type="button"
                      onClick={() => setStage("enter-email")}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Use a different email
                    </button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          No passwords. We&apos;ll email you a link or a code.
        </p>
      </div>
    </main>
  );
}
