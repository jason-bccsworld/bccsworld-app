import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plane, Shield, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { data: config } = useQuery<{ multiTenant: boolean }>({
    queryKey: ["/api/config"],
  });

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/agents");
    }
  }, [isAuthenticated, setLocation]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(err.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data.user);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  function onSubmit(data: LoginFormData) {
    setError(null);
    loginMutation.mutate(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-3xl font-bold text-white">BCCS-US</div>
              <div className="text-xs text-blue-300 font-medium tracking-wider">PATENT PENDING</div>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Aviation Compliance Platform</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Sign In
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800 text-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="you@organization.com"
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-4 border-t border-white/10">
              {config?.multiTenant ? (
                <p className="text-xs text-slate-500 text-center">
                  New here?{" "}
                  <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                    Create your organization
                  </Link>{" "}
                  — free 30-day trial, then invite your team
                </p>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Contact your administrator for account access
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          &copy; BCCS-US Aviation Compliance Platform &bull; Patent Pending
        </p>
      </div>
    </div>
  );
}
