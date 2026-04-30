import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, CheckCircle2, AlertCircle, FileText, Building2, Shield } from "lucide-react";

type FieldType = "text" | "textarea" | "date" | "number" | "checkbox" | "select" | "email" | "phone";

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface PublicTemplate {
  id: string;
  title: string;
  description: string | null;
  organizationName: string | null;
  faaSourceId: string | null;
  faaDocumentTitle: string | null;
  faaDocumentType: string | null;
  fields: FormField[];
  publicToken: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cfr_part: "14 CFR Part",
  faa_order: "FAA Order",
  safo: "SAFO",
  info: "InFO",
  advisory_circular: "Advisory Circular",
};

async function fetchPublicForm(token: string): Promise<PublicTemplate> {
  const res = await fetch(`/api/digital-forms/public/${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Form not found" }));
    throw new Error(err.message || "Form not found");
  }
  return res.json();
}

async function submitPublicForm(token: string, body: object): Promise<{ success: boolean; submissionId: string }> {
  const res = await fetch(`/api/digital-forms/public/${token}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Submission failed" }));
    throw new Error(err.message || "Submission failed");
  }
  return res.json();
}

export default function PublicForm() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [values, setValues] = useState<Record<string, any>>({});
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { data: template, isLoading, error } = useQuery<PublicTemplate>({
    queryKey: ["public-form", token],
    queryFn: () => fetchPublicForm(token!),
    retry: false,
    staleTime: Infinity,
  });

  const submitMutation = useMutation({
    mutationFn: (body: object) => submitPublicForm(token!, body),
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => setErrors([e.message || "Submission failed. Please try again."]),
  });

  const setValue = (id: string, val: any) => setValues((v) => ({ ...v, [id]: val }));

  const handleSubmit = () => {
    if (!template) return;
    const newErrors: string[] = [];

    if (!submitterName.trim()) newErrors.push("Your name is required");

    for (const field of template.fields) {
      if (field.required) {
        const val = values[field.id];
        if (val === undefined || val === "" || val === null || val === false) {
          newErrors.push(`"${field.label}" is required`);
        }
      }
    }

    if (newErrors.length) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrors([]);
    submitMutation.mutate({
      formData: values,
      submitterName: submitterName.trim(),
      submitterEmail: submitterEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  // ── Loading state ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading form...</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────────

  if (error || !template) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Form Not Found</h1>
          <p className="text-slate-500">
            This form link is invalid or the form is no longer available. Please contact your organization for a new link.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Plane size={12} />
            <span>Powered by BCCS-US Aviation Compliance Platform</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Form Submitted</h1>
          {template.organizationName && (
            <p className="text-slate-600 mb-2">
              Your response has been sent to <strong>{template.organizationName}</strong>.
            </p>
          )}
          <p className="text-slate-500 text-sm">
            Thank you for completing <strong>{template.title}</strong>. Your submission has been recorded and will be reviewed by the team.
          </p>
          {template.faaDocumentTitle && (
            <p className="text-xs text-slate-400 mt-4">
              Referenced: {DOC_TYPE_LABELS[template.faaDocumentType || ""] || ""} — {template.faaDocumentTitle}
            </p>
          )}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Plane size={12} />
            <span>Powered by BCCS-US Aviation Compliance Platform</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header banner */}
      <div className="bg-blue-700 text-white py-4 px-6 shadow">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="p-1.5 bg-white bg-opacity-20 rounded-lg">
            <Plane size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wide">BCCS-US</p>
            <p className="text-sm font-semibold">Aviation Compliance Platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Form header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">{template.title}</h1>
              {template.organizationName && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Building2 size={13} className="text-slate-400" />
                  <span className="text-sm text-slate-600 font-medium">{template.organizationName}</span>
                </div>
              )}
              {template.description && (
                <p className="text-sm text-slate-500 mt-2">{template.description}</p>
              )}
              {template.faaDocumentTitle && (
                <div className="flex items-center gap-1.5 mt-3 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-lg w-fit">
                  <Shield size={11} />
                  <span>
                    {DOC_TYPE_LABELS[template.faaDocumentType || ""] || "FAA Document"}: {template.faaDocumentTitle}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-sm font-medium text-red-700">Please fix the following:</p>
            </div>
            <ul className="space-y-1">
              {errors.map((e, i) => (
                <li key={i} className="text-sm text-red-600 pl-2">• {e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submitter info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Your Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="Your full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email Address <span className="text-slate-400 text-xs">(optional)</span></Label>
              <Input
                type="email"
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-5 uppercase tracking-wide">Form Fields</h2>
          <div className="space-y-5">
            {template.fields.map((field) => (
              <div key={field.id}>
                <Label className="text-sm text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {field.type === "text" && (
                  <Input
                    value={values[field.id] || ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    className="mt-1"
                  />
                )}
                {field.type === "email" && (
                  <Input
                    type="email"
                    value={values[field.id] || ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    placeholder={field.placeholder || "email@example.com"}
                    className="mt-1"
                  />
                )}
                {field.type === "phone" && (
                  <Input
                    type="tel"
                    value={values[field.id] || ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    placeholder={field.placeholder || "+1 (555) 000-0000"}
                    className="mt-1"
                  />
                )}
                {field.type === "textarea" && (
                  <Textarea
                    value={values[field.id] || ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    rows={3}
                    className="mt-1"
                  />
                )}
                {field.type === "date" && (
                  <Input
                    type="date"
                    value={values[field.id] || ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    className="mt-1"
                  />
                )}
                {field.type === "number" && (
                  <Input
                    type="number"
                    value={values[field.id] || ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    placeholder={field.placeholder || "0"}
                    className="mt-1"
                  />
                )}
                {field.type === "checkbox" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id={`pub_${field.id}`}
                      checked={!!values[field.id]}
                      onCheckedChange={(v) => setValue(field.id, !!v)}
                    />
                    <Label htmlFor={`pub_${field.id}`} className="cursor-pointer font-normal text-slate-600">
                      Yes
                    </Label>
                  </div>
                )}
                {field.type === "select" && (
                  <Select value={values[field.id] || ""} onValueChange={(v) => setValue(field.id, v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={field.placeholder || "Select an option..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <Label className="text-sm text-slate-700">
            Additional Notes <span className="text-slate-400 text-xs">(optional)</span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information or comments..."
            rows={3}
            className="mt-2"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 rounded-xl shadow"
        >
          <CheckCircle2 size={18} className="mr-2" />
          {submitMutation.isPending ? "Submitting..." : "Submit Form"}
        </Button>

        <p className="text-center text-xs text-slate-400 mt-4">
          Your submission will be securely recorded and reviewed by {template.organizationName || "the organization"}.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Plane size={12} />
          <span>Powered by BCCS-US Aviation Compliance Platform</span>
        </div>
      </div>
    </div>
  );
}
