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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plane, Building2, AlertCircle, ShieldCheck } from "lucide-react";

const signupSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is required").max(200),
  organizationType: z.enum(["part_142", "part_141", "part_121", "part_135", "mro", "atc"]),
  regulatoryAuthority: z.enum(["faa", "easa", "transport_canada", "casa"]),
  certificateNumber: z.string().trim().max(100).optional(),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

type SignupFormData = z.infer<typeof signupSchema>;

const ORG_TYPES = [
  { value: "part_142", label: "Part 142 Training Center" },
  { value: "part_141", label: "Part 141 Flight School" },
  { value: "part_121", label: "Part 121 Air Carrier" },
  { value: "part_135", label: "Part 135 Operator" },
  { value: "mro", label: "Maintenance (MRO)" },
  { value: "atc", label: "Air Traffic Control" },
];

const AUTHORITIES = [
  { value: "faa", label: "FAA (United States)" },
  { value: "easa", label: "EASA (Europe)" },
  { value: "transport_canada", label: "Transport Canada" },
  { value: "casa", label: "CASA (Australia)" },
];

const fieldClass = "bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400";

export default function Signup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { data: config, isLoading: configLoading } = useQuery<{ multiTenant: boolean }>({
    queryKey: ["/api/config"],
  });

  useEffect(() => {
    if (isAuthenticated) setLocation("/agents");
  }, [isAuthenticated, setLocation]);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organizationName: "",
      organizationType: "part_142",
      regulatoryAuthority: "faa",
      certificateNumber: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const body = await res.json().catch(() => ({ message: "Signup failed" }));
      if (!res.ok) throw new Error(body.message || "Signup failed");
      return body;
    },
    onSuccess: (data) => {
      if (data.requiresLogin) {
        setLocation("/login");
        return;
      }
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/user"], data.user);
      setLocation("/agents");
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(data: SignupFormData) {
    setError(null);
    signupMutation.mutate(data);
  }

  // Signup is only available in multi-tenant deployments
  if (!configLoading && !config?.multiTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
        <Card className="border border-white/10 bg-white/5 backdrop-blur-sm max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-white">Signup unavailable</CardTitle>
            <CardDescription className="text-slate-400">
              Self-serve signup is not enabled on this deployment. Please contact your administrator for account access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
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
          <p className="text-slate-400 text-sm">Create your organization's compliance workspace</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Create Organization
            </CardTitle>
            <CardDescription className="text-slate-400">
              Starts with a free 30-day trial — you'll be the first administrator and can invite your team
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
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Organization name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Skyline Flight Academy" className={fieldClass} />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="organizationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={fieldClass}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ORG_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="regulatoryAuthority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Regulatory authority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={fieldClass}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AUTHORITIES.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="certificateNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Certificate number <span className="text-slate-500">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. BCCS-142-0057" className={fieldClass} />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <div className="pt-2 border-t border-white/10">
                  <p className="text-sm text-slate-300 font-medium mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" /> Administrator account
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300">First name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Jane" className={fieldClass} autoComplete="given-name" />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-300">Last name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Doe" className={fieldClass} autoComplete="family-name" />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Work email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@organization.com" className={fieldClass} autoComplete="email" />
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
                        <Input {...field} type="password" placeholder="At least 8 characters" className={fieldClass} autoComplete="new-password" />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
                  disabled={signupMutation.isPending || configLoading}
                >
                  {signupMutation.isPending ? "Creating your workspace..." : "Create organization"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-xs text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
              </p>
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
