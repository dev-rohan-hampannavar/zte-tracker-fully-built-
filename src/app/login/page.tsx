"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Terminal, Loader2, GitBranch, Radar, Repeat, Layers } from "lucide-react";

// Sign-in pitch — my own framing of what this tool is and why it's
// different, deliberately NOT lifted from Orientation/WhyThisWorks/
// roadmap.md (those already exist in /welcome and /reference for people
// who want the curriculum's own pitch for itself). This is about the
// *tracker*, not the curriculum: what a person actually gets by using
// this over a checklist, a Notion doc, or just reading roadmap.md
// top to bottom.
const PITCH_POINTS = [
  {
    icon: Layers,
    title: "It's not a checklist — it's a dependency graph",
    body:
      "A markdown checklist can't tell you that you're not ready for Topic 40 because you skipped Topic 12. This tracker knows the prerequisite structure of the roadmap and will actually lock what you're not ready for, instead of letting you feel productive while building on a gap.",
  },
  {
    icon: Radar,
    title: "One page instead of eight tabs",
    body:
      "Progress, revision due-dates, DSA streaks, project status, and interview pipeline usually live in five different apps that drift out of sync. Here they're one connected dataset — mark a topic done and your dashboard, statistics, and \"what's next\" all move together, same moment.",
  },
  {
    icon: Repeat,
    title: "It remembers to make you forget less",
    body:
      "Finishing a topic once and never touching it again is how most self-taught learners quietly lose 30% of what they \"knew.\" Every completed topic gets a spaced-repetition due date automatically — this is the part almost no tracker bothers to build, because it's invisible until you need it.",
  },
  {
    icon: GitBranch,
    title: "Built to survive you actually using it",
    body:
      "Offline-tolerant logging, exportable data you actually own, keyboard shortcuts for the days you're moving fast, and a streak that reflects real study sessions — not a vanity number that resets the first week you get sick.",
  },
];

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
    <main className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
        {/* Pitch panel — see PITCH_POINTS above for content rationale */}
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Terminal className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">ZTE Tracker</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight leading-snug">
              A roadmap is a plan. This is what makes you actually follow it.
            </h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Zero to Elite is the curriculum — what to learn, in what order. This tracker is the
              part most people skip building for themselves: the system that keeps you honest about
              whether you&apos;re actually on it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PITCH_POINTS.map((p) => (
              <div key={p.title} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                    <p.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-medium leading-tight">{p.title}</p>
                </div>
                <p className="text-xs text-muted leading-relaxed pl-9">{p.body}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted/70 leading-relaxed">
            Want the curriculum&apos;s own case for itself — who it&apos;s for, why the phase order
            works, the realistic timeline? That&apos;s on the{" "}
            <a href="/welcome" className="underline hover:text-foreground">
              welcome tour
            </a>
            . This is the pitch for the tool you&apos;re about to sign into.
          </p>
        </div>

        {/* Sign-in form */}
        <div className="w-full max-w-sm mx-auto lg:mx-0 order-1 lg:order-2">
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
      </div>
    </main>
  );
}