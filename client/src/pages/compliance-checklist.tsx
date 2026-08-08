import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  BookOpen,
  GraduationCap,
  Building,
  Plane,
  Archive,
  PlayCircle,
  Shield,
  Download,
  Upload,
  ExternalLink,
  Sparkles,
  Loader2,
  FileUp,
  RotateCcw,
  Paperclip,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface AiFinding {
  verdict: 'covered' | 'partial' | 'not_addressed';
  excerpt: string;
  remediation: string;
  reviewed_at: string;
  manual_id: string;
  stale: boolean;
}

interface ManualDoc {
  id: string;
  filename: string;
  text_chars: number;
  uploaded_by: string | null;
  uploaded_at: string;
}

interface EvidenceFile {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  uploadedAt: string;
}

interface ChecklistItem {
  id: string;
  number: string;
  description: string;
  reference: string;
  status: 'compliant' | 'non-compliant' | 'pending' | 'not-applicable';
  comments: string;
  findings: string;
  aiFinding: AiFinding | null;
  evidence: EvidenceFile[];
}

interface InspectionArea {
  id: string;
  name: string;
  description: string;
  coverage?: { totalManualChars: number; excerptChars: number; ratio: number; reviewedAt: string; stale?: boolean } | null;
  items: ChecklistItem[];
}

const AREA_ICONS: Record<string, React.ComponentType<any>> = {
  area1: Users,
  area2: Building,
  area3: BookOpen,
  area4: GraduationCap,
  area5: Plane,
  area6: PlayCircle,
  area7: Shield,
  area8: FileText,
  area9: Archive,
  area10: CheckCircle,
};

// Reference URL mappings for regulatory documents
const referenceUrls: Record<string, string> = {
  '142.11': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.11',
  '142.13': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.13',
  '142.15': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.15',
  '142.17': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.17',
  '142.5': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.5',
  '142.27': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.27',
  '142.9': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.9',
  '142.31': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.31',
  '142.33': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.33',
  '142.47': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.47',
  '142.59': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.59',
  '142.63': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.63',
  '142.65': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.65',
  '142.71': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.71',
  '142.73': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-142/section-142.73',
  'AC 60-14': 'https://www.faa.gov/documentlibrary/media/advisory_circular/ac_60-14.pdf',
  'V2 C10 S1': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume2/2_010_00.pdf',
  'V3 C54 S1': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C54 S2': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C54 S5': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C54 S6': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_054_00.pdf',
  'V3 C18': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_018_00.pdf',
  'V3 C19 S6': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_019_00.pdf',
  'V3 C20': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume3/3_020_00.pdf',
  'V6 C8 S1': 'https://www.faa.gov/documentlibrary/media/order/8900.1/volume6/6_008_00.pdf',
  'Part 61': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61',
  '14 CFR part 60': 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-60'
};

// Function to parse reference text and create clickable links
function parseReferenceLinks(reference: string) {
  const parts = reference.split(/[,;]\s*/);

  return (
    <div className="space-y-1">
      {parts.map((part, index) => {
        const trimmedPart = part.trim();

        const matchingKey = Object.keys(referenceUrls).find(key =>
          trimmedPart.includes(key)
        );

        if (matchingKey && referenceUrls[matchingKey]) {
          return (
            <div key={index} className="flex items-center gap-2">
              <a
                href={referenceUrls[matchingKey]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                {trimmedPart}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        }

        return (
          <div key={index} className="text-gray-600">
            {trimmedPart}
          </div>
        );
      })}
    </div>
  );
}

const VERDICT_LABEL: Record<string, { label: string; className: string }> = {
  covered: { label: 'Covered by manual', className: 'bg-green-100 text-green-800' },
  partial: { label: 'Partially covered', className: 'bg-yellow-100 text-yellow-800' },
  not_addressed: { label: 'Not addressed', className: 'bg-red-100 text-red-800' },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildReportHtml(areas: InspectionArea[], manualInfo: any, organization: any): string {
  const now = new Date();
  const totalItems = areas.reduce((s, a) => s + a.items.length, 0);
  const count = (st: string) => areas.reduce((s, a) => s + a.items.filter(i => i.status === st).length, 0);
  const aiCount = (v: string) => areas.reduce((s, a) => s + a.items.filter(i => i.aiFinding?.verdict === v).length, 0);
  const reviewed = areas.reduce((s, a) => s + a.items.filter(i => i.aiFinding).length, 0);
  const completed = count('compliant') + count('non-compliant') + count('not-applicable');

  const areaSections = areas.map(area => `
    <section class="area">
      <h2>${escapeHtml(area.name)}</h2>
      <p class="muted">${escapeHtml(area.description || '')}</p>
      <table>
        <thead><tr><th style="width:8%">Item</th><th style="width:34%">Requirement</th><th style="width:12%">Status</th><th style="width:14%">AI Review</th><th style="width:32%">Notes / Findings</th></tr></thead>
        <tbody>
        ${area.items.map(item => {
          const v = item.aiFinding
            ? (VERDICT_LABEL[item.aiFinding.verdict]?.label || item.aiFinding.verdict) + (item.aiFinding.stale ? ' (stale — from a previous manual)' : '')
            : '—';
          const notes = [
            item.comments ? `<div><strong>Comments:</strong> ${escapeHtml(item.comments)}</div>` : '',
            item.findings ? `<div><strong>Findings:</strong> ${escapeHtml(item.findings)}</div>` : '',
            item.aiFinding?.excerpt ? `<div class="excerpt"><strong>Manual excerpt:</strong> &ldquo;${escapeHtml(item.aiFinding.excerpt)}&rdquo;</div>` : '',
            item.aiFinding?.remediation ? `<div class="remediation"><strong>Suggested remediation:</strong> ${escapeHtml(item.aiFinding.remediation)}</div>` : '',
            item.evidence?.length ? `<div class="evidence"><strong>Evidence on file (${item.evidence.length}):</strong> ${item.evidence.map(e => escapeHtml(e.filename)).join('; ')}</div>` : '',
          ].filter(Boolean).join('') || '—';
          return `<tr>
            <td>${escapeHtml(item.number)}</td>
            <td>${escapeHtml(item.description)}<div class="ref">${escapeHtml(item.reference)}</div></td>
            <td class="st-${item.status}">${escapeHtml(item.status.replace('-', ' '))}</td>
            <td>${escapeHtml(v)}</td>
            <td>${notes}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </section>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Part Checklist Report</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 22px; margin-bottom: 2px; }
  h2 { font-size: 16px; border-bottom: 2px solid #1a355e; padding-bottom: 4px; margin-top: 28px; }
  .muted { color: #555; font-size: 12px; }
  .header { border-bottom: 3px double #1a355e; padding-bottom: 12px; margin-bottom: 16px; }
  .summary { display: flex; gap: 24px; flex-wrap: wrap; margin: 16px 0; }
  .summary .stat { border: 1px solid #ccc; padding: 8px 14px; text-align: center; }
  .summary .stat b { display: block; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
  th, td { border: 1px solid #bbb; padding: 5px 7px; vertical-align: top; text-align: left; }
  th { background: #eef2f7; }
  .ref { color: #666; font-size: 10px; margin-top: 3px; }
  .st-compliant { color: #166534; font-weight: bold; }
  .st-non-compliant { color: #991b1b; font-weight: bold; }
  .st-pending { color: #92400e; }
  .excerpt { color: #1e40af; margin-top: 3px; }
  .remediation { color: #9a3412; margin-top: 3px; }
  .evidence { color: #374151; margin-top: 3px; }
  .area { page-break-inside: avoid; }
  @media print { body { margin: 12mm; } .area { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style></head>
<body>
  <div class="header">
    <h1>Part Checklist Report</h1>
    <div class="muted">FAA Training Center Inspection Checklist &amp; Job Aid — Auditor Report</div>
    ${organization ? `<div style="margin-top:6px;font-size:14px;"><strong>${escapeHtml(organization.name || '')}</strong>${organization.certificateNumber ? ` &middot; Certificate No. ${escapeHtml(organization.certificateNumber)}` : ''}${organization.regulatoryAuthority ? ` &middot; ${escapeHtml(organization.regulatoryAuthority)}` : ''}</div>` : ''}
    <div class="muted">Generated: ${now.toLocaleString()}</div>
    ${manualInfo?.manuals?.length ? `<div class="muted">Operations manual${manualInfo.manuals.length > 1 ? 's' : ''} reviewed: ${manualInfo.manuals.map((m: any) => `${escapeHtml(m.filename)} (uploaded ${new Date(m.uploaded_at).toLocaleDateString()})`).join('; ')}${manualInfo.lastReviewAt ? `; last AI review ${new Date(manualInfo.lastReviewAt).toLocaleString()}` : ''}</div>` : '<div class="muted">No operations manual on file — AI review not performed.</div>'}
  </div>
  <div class="summary">
    <div class="stat"><b>${totalItems}</b>Total items</div>
    <div class="stat"><b>${count('compliant')}</b>Compliant</div>
    <div class="stat"><b>${count('non-compliant')}</b>Non-compliant</div>
    <div class="stat"><b>${count('not-applicable')}</b>N/A</div>
    <div class="stat"><b>${count('pending')}</b>Pending</div>
    <div class="stat"><b>${Math.round(totalItems ? (completed / totalItems) * 100 : 0)}%</b>Assessed</div>
    ${reviewed > 0 ? `
    <div class="stat"><b>${aiCount('covered')}</b>AI: covered</div>
    <div class="stat"><b>${aiCount('partial')}</b>AI: partial</div>
    <div class="stat"><b>${aiCount('not_addressed')}</b>AI: not addressed</div>` : ''}
  </div>
  ${areaSections}
</body></html>`;
}

export default function ComplianceChecklist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inspectionAreas, setInspectionAreas] = useState<InspectionArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [savePending, setSavePending] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reviewProgress, setReviewProgress] = useState<{ done: number; total: number } | null>(null);
  // Per-area manual coverage from the most recent AI review run — how much of
  // the combined manual text each area's review prompt actually consulted.
  const [areaCoverage, setAreaCoverage] = useState<Record<string, { ratio: number; stale: boolean }>>({});
  const [evidenceUploading, setEvidenceUploading] = useState<string | null>(null);
  const evidenceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: checklistData, isLoading } = useQuery({
    queryKey: ['/api/checklist-report/checklist'],
    queryFn: async () => {
      const res = await fetch('/api/checklist-report/checklist', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load checklist');
      return res.json();
    }
  });

  const { data: manualInfo } = useQuery({
    queryKey: ['/api/checklist-report/manual'],
    queryFn: async () => {
      const res = await fetch('/api/checklist-report/manual', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load manual status');
      return res.json();
    }
  });

  useEffect(() => {
    if (checklistData?.areas) {
      setInspectionAreas(checklistData.areas);
      // Seed per-area coverage from persisted review records so the note
      // survives a page reload; in-session values (a just-finished run) win.
      setAreaCoverage(prev => {
        const stored: Record<string, { ratio: number; stale: boolean }> = {};
        for (const a of checklistData.areas as InspectionArea[]) {
          if (typeof a.coverage?.ratio === 'number') stored[a.id] = { ratio: a.coverage.ratio, stale: !!a.coverage.stale };
        }
        // Server staleness is authoritative after a refetch — a manual upload
        // or delete must be able to flag an in-session coverage value stale.
        return { ...prev, ...stored };
      });
      if (!selectedArea && checklistData.areas.length > 0) {
        setSelectedArea(checklistData.areas[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistData]);

  const saveItem = async (itemId: string, patch: Record<string, string>) => {
    setSavePending(true);
    try {
      const res = await fetch(`/api/checklist-report/items/${itemId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      toast({ title: 'Save failed', description: 'Your change could not be saved.', variant: 'destructive' });
    } finally {
      setSavePending(false);
    }
  };

  const updateItemStatus = (areaId: string, itemId: string, field: string, value: string) => {
    setInspectionAreas(prev => prev.map(area =>
      area.id === areaId
        ? { ...area, items: area.items.map(item => item.id === itemId ? { ...item, [field]: value } : item) }
        : area
    ));
    // Debounce text fields; save status immediately
    if (field === 'status') {
      saveItem(itemId, { status: value });
    } else {
      if (saveTimers.current[itemId + field]) clearTimeout(saveTimers.current[itemId + field]);
      saveTimers.current[itemId + field] = setTimeout(() => saveItem(itemId, { [field]: value }), 1200);
    }
  };

  // Phase 1: parse-only preview of pasted text (no DB changes)
  const previewTextMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/checklist-report/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Could not read the checklist text');
      return { text, body };
    },
    onSuccess: ({ text, body }) => {
      setImportPreview({
        source: { kind: 'text', text },
        itemCount: body.itemCount,
        areas: body.areas || [],
        skippedSheets: [],
      });
    },
    onError: (err: any) => toast({ title: 'Import failed', description: err.message, variant: 'destructive' })
  });

  // Phase 2: confirmed replace of the checklist from pasted text
  const importMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/checklist-report/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, confirm: true })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Import failed');
      return body;
    },
    onSuccess: (data) => {
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/checklist'] });
      setImportOpen(false);
      setImportText('');
      setSelectedArea('');
      toast({ title: 'Checklist imported', description: `${data.imported} items imported. The previous checklist was replaced.` });
    },
    onError: (err: any) => toast({ title: 'Import failed', description: err.message, variant: 'destructive' })
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/checklist-report/reset', { method: 'POST', credentials: 'include' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Reset failed');
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/checklist'] });
      setImportOpen(false);
      setSelectedArea('');
      toast({ title: 'Checklist restored', description: 'The built-in Part 142 checklist has been restored.' });
    },
    onError: (err: any) => toast({ title: 'Restore failed', description: err.message, variant: 'destructive' })
  });

  const [importFileUploading, setImportFileUploading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    source: { kind: 'files'; files: File[] } | { kind: 'text'; text: string };
    itemCount: number;
    areas: { name: string; itemCount: number }[];
    skippedSheets: string[];
    files?: { name: string; itemCount: number }[];
  } | null>(null);

  const handleImportFiles = (files: File[]) => {
    if (files.length === 0) return;
    const spreadsheets = files.filter((f) => ['xlsx', 'xls', 'csv'].includes(f.name.toLowerCase().split('.').pop() || ''));
    if (spreadsheets.length > 0) {
      if (spreadsheets.length !== files.length) {
        toast({ title: 'Mixed file types', description: 'Select only spreadsheet files (.xlsx, .xls, .csv) — or a single text file to paste its contents.', variant: 'destructive' });
        return;
      }
      // Spreadsheets are parsed server-side; preview first (no DB changes)
      previewFileMutation.mutate(spreadsheets);
      return;
    }
    if (files.length > 1) {
      toast({ title: 'One text file at a time', description: 'Multiple files are supported for spreadsheets (.xlsx, .xls, .csv) only.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result || ''));
    reader.readAsText(files[0]);
  };

  const previewFileMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setImportFileUploading(true);
      try {
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        const res = await fetch('/api/checklist-report/import-file', { method: 'POST', credentials: 'include', body: fd });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || 'Could not read the file');
        return { files, body };
      } finally {
        setImportFileUploading(false);
      }
    },
    onSuccess: ({ files, body }) => {
      setImportPreview({
        source: { kind: 'files', files },
        itemCount: body.itemCount,
        areas: body.areas || [],
        skippedSheets: body.skippedSheets || [],
        files: body.files || [],
      });
    },
    onError: (err: any) => toast({ title: 'Import failed', description: err.message, variant: 'destructive' })
  });

  const importFileMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setImportFileUploading(true);
      try {
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        fd.append('confirm', 'true');
        const res = await fetch('/api/checklist-report/import-file', { method: 'POST', credentials: 'include', body: fd });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || 'Import failed');
        return body;
      } finally {
        setImportFileUploading(false);
      }
    },
    onSuccess: (data) => {
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/checklist'] });
      setImportOpen(false);
      setImportText('');
      setSelectedArea('');
      const skipped: string[] = data.skippedSheets || [];
      toast({
        title: 'Checklist imported',
        description: `${data.imported} items imported from ${(data.files || []).length > 1 ? `${data.files.length} spreadsheets` : 'the spreadsheet'}. The previous checklist was replaced.` +
          (skipped.length ? ` Note: ${skipped.length} tab${skipped.length > 1 ? 's' : ''} could not be imported (no recognizable checklist rows): ${skipped.join(', ')}.` : ''),
        ...(skipped.length ? { duration: 12000 } : {}),
      });
    },
    onError: (err: any) => toast({ title: 'Import failed', description: err.message, variant: 'destructive' })
  });

  const exportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await fetch('/api/checklist-report/export.xlsx', { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `part-checklist-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: 'Excel export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleManualUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      const res = await fetch('/api/checklist-report/manual', { method: 'POST', credentials: 'include', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Upload failed');
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/manual'] });
      // Adding a document changes the manual set — per-item finding stale
      // flags come from the checklist query, so refresh it too.
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/checklist'] });
      const added: any[] = body.manuals || [];
      const chars = added.reduce((s, m) => s + Number(m.text_chars || 0), 0);
      toast({
        title: added.length > 1 ? `${added.length} documents uploaded` : 'Manual uploaded',
        description: `${added.map((m) => m.filename).join(', ')} processed — ${chars.toLocaleString()} characters of text extracted. Run AI Review to compare against the checklist.`,
      });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualDelete = async (doc: ManualDoc) => {
    try {
      const res = await fetch(`/api/checklist-report/manual/${doc.id}`, { method: 'DELETE', credentials: 'include' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Delete failed');
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/manual'] });
      queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/checklist'] });
      toast({ title: 'Document removed', description: `${doc.filename} was removed from the manual set. Re-run the AI review to refresh findings.` });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const setItemEvidence = (itemId: string, updater: (prev: EvidenceFile[]) => EvidenceFile[]) => {
    setInspectionAreas(prev => prev.map(area => ({
      ...area,
      items: area.items.map(item => item.id === itemId ? { ...item, evidence: updater(item.evidence || []) } : item),
    })));
  };

  const handleEvidenceUpload = async (itemId: string, file: File) => {
    setEvidenceUploading(itemId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/checklist-report/items/${itemId}/evidence`, { method: 'POST', credentials: 'include', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Upload failed');
      setItemEvidence(itemId, prev => [...prev, body]);
      toast({ title: 'Evidence attached', description: `${file.name} was attached to this checklist item.` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setEvidenceUploading(null);
      const input = evidenceInputRefs.current[itemId];
      if (input) input.value = '';
    }
  };

  const handleEvidenceDelete = async (itemId: string, evidenceId: string, filename: string) => {
    try {
      const res = await fetch(`/api/checklist-report/evidence/${evidenceId}`, { method: 'DELETE', credentials: 'include' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || 'Delete failed');
      setItemEvidence(itemId, prev => prev.filter(e => e.id !== evidenceId));
      toast({ title: 'Evidence removed', description: `${filename} was removed.` });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const runAiReview = async () => {
    if (!manualInfo?.manuals?.length) {
      toast({ title: 'No manual uploaded', description: 'Upload your operations manual first, then run the AI review.', variant: 'destructive' });
      return;
    }
    const areas = inspectionAreas;
    setReviewProgress({ done: 0, total: areas.length });
    let failed: string | null = null;
    let lowestCoverage = 1;
    for (let i = 0; i < areas.length; i++) {
      try {
        const res = await fetch(`/api/checklist-report/review/${areas[i].id}`, { method: 'POST', credentials: 'include' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) { failed = body.message || 'AI review failed'; break; }
        if (typeof body.coverage?.ratio === 'number') {
          lowestCoverage = Math.min(lowestCoverage, body.coverage.ratio);
          const ratio = body.coverage.ratio;
          const areaId = areas[i].id;
          setAreaCoverage(prev => ({ ...prev, [areaId]: { ratio, stale: false } }));
        }
      } catch (err: any) {
        failed = err.message || 'AI review failed';
        break;
      }
      setReviewProgress({ done: i + 1, total: areas.length });
    }
    setReviewProgress(null);
    queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/checklist'] });
    queryClient.invalidateQueries({ queryKey: ['/api/checklist-report/manual'] });
    if (failed) {
      toast({ title: 'AI review stopped', description: failed, variant: 'destructive' });
    } else {
      const coverageNote = lowestCoverage < 1
        ? ` Note: as little as ${Math.max(1, Math.round(lowestCoverage * 100))}% of your combined manual text could be consulted per area, so coverage may be partial.`
        : '';
      toast({ title: 'AI review complete', description: `Every checklist item has been reviewed against your operations manual.${coverageNote}` });
    }
  };

  const exportReport = () => {
    const html = buildReportHtml(inspectionAreas, manualInfo, checklistData?.organization || null);
    const win = window.open('', '_blank');
    if (!win) {
      toast({ title: 'Popup blocked', description: 'Allow popups for this site to export the report.', variant: 'destructive' });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'non-compliant':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'not-applicable':
        return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'compliant': 'bg-green-100 text-green-800',
      'non-compliant': 'bg-red-100 text-red-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'not-applicable': 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={variants[status] || variants['pending']}>
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const calculateAreaProgress = (area: InspectionArea) => {
    if (area.items.length === 0) return 0;
    const completedItems = area.items.filter(item =>
      item.status === 'compliant' || item.status === 'non-compliant' || item.status === 'not-applicable'
    ).length;
    return (completedItems / area.items.length) * 100;
  };

  const calculateOverallProgress = () => {
    const totalItems = inspectionAreas.reduce((sum, area) => sum + area.items.length, 0);
    if (totalItems === 0) return 0;
    const completedItems = inspectionAreas.reduce((sum, area) =>
      sum + area.items.filter(item =>
        item.status === 'compliant' || item.status === 'non-compliant' || item.status === 'not-applicable'
      ).length, 0
    );
    return (completedItems / totalItems) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading checklist…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Part Checklist Report</h1>
          <p className="text-gray-600 mt-2">FAA Training Center Inspection Checklist & Job Aid</p>
        </div>
        <div className="flex gap-2 items-center shrink-0 flex-wrap">
          {savePending && (
            <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>
          )}
          <Button variant="outline" onClick={() => setImportOpen(true)} data-testid="button-import-checklist">
            <Upload className="h-4 w-4 mr-2" />
            Import Checklist
          </Button>
          <Button variant="outline" onClick={exportExcel} disabled={exportingExcel} data-testid="button-export-excel">
            {exportingExcel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export to Excel
          </Button>
          <Button onClick={exportReport} data-testid="button-export-report">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Operations Manual & AI Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Operations Manual AI Review
          </CardTitle>
          <CardDescription>
            Upload your operations manual and let AI review it against every checklist item — coverage verdicts, supporting excerpts, and suggested remediation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 text-sm">
              {manualInfo?.manuals?.length ? (
                <div className="space-y-2">
                  <ul className="space-y-1" data-testid="list-manual-documents">
                    {manualInfo.manuals.map((doc: ManualDoc) => (
                      <li key={doc.id} className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                        <span className="font-medium truncate" data-testid={`text-manual-filename-${doc.id}`}>{doc.filename}</span>
                        <span className="text-gray-500 shrink-0 text-xs">
                          {new Date(doc.uploaded_at).toLocaleDateString()} · {Number(doc.text_chars).toLocaleString()} chars
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-gray-400 hover:text-red-600 shrink-0"
                          onClick={() => handleManualDelete(doc)}
                          data-testid={`button-delete-manual-${doc.id}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {manualInfo.lastReviewAt && (
                    <div className="text-gray-500">Last AI review: {new Date(manualInfo.lastReviewAt).toLocaleString()}</div>
                  )}
                  {manualInfo.reviewStale && (
                    <Badge className="bg-amber-100 text-amber-800">Findings pre-date a change to your manual documents — re-run the AI review</Badge>
                  )}
                  {manualInfo.promptCoverage?.limited && (
                    <div
                      className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800"
                      data-testid="warning-manual-coverage"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Your documents contain {Number(manualInfo.totalChars).toLocaleString()} characters of text, but each AI review can
                        only consult about {Number(manualInfo.promptCoverage.maxExcerptChars).toLocaleString()} characters of the most relevant
                        excerpts (roughly {Math.max(1, Math.round(manualInfo.promptCoverage.ratio * 100))}% per area). Coverage may be partial —
                        a &ldquo;not addressed&rdquo; finding could exist in a section the review didn&apos;t see. Consider trimming or splitting
                        very large documents.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">No operations manual uploaded yet. Accepted formats: PDF, Word (.docx), Excel (.xlsx/.xls), CSV, or plain text. You can upload several documents.</span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.xlsx,.xls,.csv"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleManualUpload(Array.from(e.target.files))}
              />
              <Button variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()} data-testid="button-upload-manual">
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
                {uploading ? 'Processing…' : manualInfo?.manuals?.length ? 'Add Documents' : 'Upload Manual'}
              </Button>
              <Button disabled={!manualInfo?.manuals?.length || !!reviewProgress} onClick={runAiReview} data-testid="button-ai-review">
                {reviewProgress ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {reviewProgress ? `Reviewing ${reviewProgress.done}/${reviewProgress.total} areas…` : 'Run AI Review'}
              </Button>
            </div>
          </div>
          {reviewProgress && (
            <div className="mt-4">
              <Progress value={(reviewProgress.done / reviewProgress.total) * 100} className="h-2" />
              <div className="text-xs text-gray-500 mt-1">Comparing your manual against each inspection area — this can take a few minutes for large manuals.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Progress</CardTitle>
          <CardDescription>Overall compliance assessment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(calculateOverallProgress())}%</span>
              </div>
              <Progress value={calculateOverallProgress()} className="h-2" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {inspectionAreas.reduce((sum, area) => sum + area.items.length, 0)}
                </div>
                <div className="text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {inspectionAreas.reduce((sum, area) =>
                    sum + area.items.filter(item => item.status === 'compliant').length, 0
                  )}
                </div>
                <div className="text-gray-600">Compliant</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">
                  {inspectionAreas.reduce((sum, area) =>
                    sum + area.items.filter(item => item.status === 'non-compliant').length, 0
                  )}
                </div>
                <div className="text-gray-600">Non-Compliant</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">
                  {inspectionAreas.reduce((sum, area) =>
                    sum + area.items.filter(item => item.status === 'pending').length, 0
                  )}
                </div>
                <div className="text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-600">
                  {inspectionAreas.reduce((sum, area) =>
                    sum + area.items.filter(item => item.status === 'not-applicable').length, 0
                  )}
                </div>
                <div className="text-gray-600">N/A</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Areas */}
      <Tabs value={selectedArea} onValueChange={setSelectedArea}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex w-max min-w-full">
            {inspectionAreas.map((area, idx) => (
              <TabsTrigger key={area.id} value={area.id} className="text-xs whitespace-nowrap px-3">
                Area {idx + 1} ({area.items.length})
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {inspectionAreas.map((area) => {
          const AreaIcon = AREA_ICONS[area.id] || FileText;
          return (
          <TabsContent key={area.id} value={area.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AreaIcon className="h-5 w-5" />
                  {area.name}
                </CardTitle>
                <CardDescription>{area.description}</CardDescription>
                {areaCoverage[area.id] && (() => {
                  const cov = areaCoverage[area.id];
                  const pct = Math.max(1, Math.round(cov.ratio * 100));
                  const low = cov.ratio < 0.5;
                  const boxClass = cov.stale
                    ? 'border-gray-200 bg-gray-50 text-gray-400'
                    : low ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-gray-200 bg-gray-50 text-gray-600';
                  return (
                    <div
                      className={`inline-flex items-center gap-1.5 mt-2 rounded-md border px-2 py-1 text-xs w-fit ${boxClass}`}
                      data-testid={`area-coverage-${area.id}`}
                    >
                      {low && !cov.stale && <AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
                      <span>
                        AI review consulted ~{pct}% of your manual text for this area
                        {cov.stale
                          ? ' (stale — measured against a previous manual set; re-run the AI review)'
                          : low ? ' — "not addressed" verdicts here may miss content the review didn\u2019t see' : ''}
                      </span>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Area Progress</span>
                      <span>{Math.round(calculateAreaProgress(area))}%</span>
                    </div>
                    <Progress value={calculateAreaProgress(area)} className="h-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {area.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-3 w-full">
                          {getStatusIcon(item.status)}
                          <div className="flex-1">
                            <div className="font-medium">{item.number}</div>
                            <div className="text-sm text-gray-600 truncate">
                              {item.description.substring(0, 100)}...
                            </div>
                          </div>
                          {item.aiFinding && (
                            <Badge className={item.aiFinding.stale ? 'bg-amber-100 text-amber-800' : (VERDICT_LABEL[item.aiFinding.verdict]?.className || 'bg-gray-100 text-gray-800')}>
                              AI: {VERDICT_LABEL[item.aiFinding.verdict]?.label || item.aiFinding.verdict}{item.aiFinding.stale ? ' (stale)' : ''}
                            </Badge>
                          )}
                          {getStatusBadge(item.status)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <div>
                            <h4 className="font-medium mb-2">Requirement</h4>
                            <p className="text-sm text-gray-700">{item.description}</p>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Reference</h4>
                            <div className="text-sm text-gray-600">
                              {parseReferenceLinks(item.reference)}
                            </div>
                          </div>

                          {item.aiFinding && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-sm">AI Manual Review</span>
                                <Badge className={VERDICT_LABEL[item.aiFinding.verdict]?.className || ''}>
                                  {VERDICT_LABEL[item.aiFinding.verdict]?.label || item.aiFinding.verdict}
                                </Badge>
                                {item.aiFinding.stale && (
                                  <Badge className="bg-amber-100 text-amber-800">From a previous manual — re-run AI review</Badge>
                                )}
                              </div>
                              {item.aiFinding.excerpt && (
                                <p className="text-sm text-gray-700 italic">&ldquo;{item.aiFinding.excerpt}&rdquo;</p>
                              )}
                              {item.aiFinding.remediation && (
                                <p className="text-sm text-orange-800"><span className="font-medium">Suggested remediation:</span> {item.aiFinding.remediation}</p>
                              )}
                              <p className="text-xs text-gray-500">Reviewed {new Date(item.aiFinding.reviewed_at).toLocaleString()}</p>
                            </div>
                          )}

                          <div>
                            <h4 className="font-medium mb-2">Compliance Status</h4>
                            <div className="flex gap-4 flex-wrap">
                              {['compliant', 'non-compliant', 'pending', 'not-applicable'].map((status) => (
                                <label key={status} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={item.status === status}
                                    onCheckedChange={() =>
                                      updateItemStatus(area.id, item.id, 'status', status)
                                    }
                                  />
                                  <span className="text-sm capitalize">
                                    {status.replace('-', ' ')}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Comments</h4>
                            <Textarea
                              value={item.comments}
                              onChange={(e) =>
                                updateItemStatus(area.id, item.id, 'comments', e.target.value)
                              }
                              placeholder="Add comments about compliance status..."
                              className="min-h-[80px]"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium flex items-center gap-2">
                                <Paperclip className="h-4 w-4" />
                                Evidence ({(item.evidence || []).length})
                              </h4>
                              <input
                                ref={(el) => { evidenceInputRefs.current[item.id] = el; }}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleEvidenceUpload(item.id, e.target.files[0])}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={evidenceUploading === item.id}
                                onClick={() => evidenceInputRefs.current[item.id]?.click()}
                                data-testid={`button-attach-evidence-${item.id}`}
                              >
                                {evidenceUploading === item.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
                                {evidenceUploading === item.id ? 'Uploading…' : 'Attach Evidence'}
                              </Button>
                            </div>
                            {(item.evidence || []).length === 0 ? (
                              <p className="text-sm text-gray-500">No evidence files attached. PDF and image files up to 10 MB are accepted.</p>
                            ) : (
                              <ul className="space-y-1">
                                {item.evidence.map((ev) => (
                                  <li key={ev.id} className="flex items-center gap-2 text-sm border rounded-md px-3 py-2" data-testid={`evidence-file-${ev.id}`}>
                                    <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                                    <a
                                      href={`/api/checklist-report/evidence/${ev.id}/file`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline truncate"
                                    >
                                      {ev.filename}
                                    </a>
                                    <span className="text-xs text-gray-500 shrink-0">
                                      {(ev.sizeBytes / 1024).toFixed(0)} KB · {new Date(ev.uploadedAt).toLocaleDateString()}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="ml-auto h-7 w-7 p-0 text-gray-500 hover:text-red-600 shrink-0"
                                      onClick={() => handleEvidenceDelete(item.id, ev.id, ev.filename)}
                                      data-testid={`button-delete-evidence-${ev.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Findings</h4>
                            <Textarea
                              value={item.findings}
                              onChange={(e) =>
                                updateItemStatus(area.id, item.id, 'findings', e.target.value)
                              }
                              placeholder="Document any findings or issues..."
                              className="min-h-[80px]"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
          );
        })}
      </Tabs>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Checklist</DialogTitle>
            <DialogDescription>
              Upload one or more Excel (.xlsx or .xls) or CSV files with columns for item number, description, reference, and area — or paste
              checklist items below, one per line:{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">number | description | reference | area name</code>.
              Importing <strong>replaces</strong> your organization's current checklist (including statuses and AI findings).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                multiple
                onChange={(e) => {
                  if (e.target.files) handleImportFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
                className="text-sm"
                data-testid="input-import-file"
              />
              {importFileUploading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
            </div>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"1-01 | Does the training center have sufficient instructors? | 142.13(a) | Management\n1-02 | ..."}
              className="min-h-[200px] font-mono text-xs"
            />
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              data-testid="button-restore-default"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Built-in Part 142 Checklist
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              <Button
                onClick={() => previewTextMutation.mutate(importText)}
                disabled={!importText.trim() || previewTextMutation.isPending}
                data-testid="button-confirm-import"
              >
                {previewTextMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import preview / confirm dialog */}
      <Dialog open={!!importPreview} onOpenChange={(open) => { if (!open) setImportPreview(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Checklist Import</DialogTitle>
            <DialogDescription>
              Review what was found in{' '}
              <strong>{importPreview?.source.kind === 'files' ? importPreview.source.files.map((f) => f.name).join(', ') : 'the pasted text'}</strong>{' '}
              before replacing your current checklist.
              Nothing has been changed yet.
            </DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-3 text-sm">
              <div data-testid="text-import-preview-summary">
                {importPreview.source.kind === 'files' && importPreview.source.files.length > 1 ? 'These files contain' : 'This file contains'} <strong>{importPreview.itemCount}</strong> item{importPreview.itemCount === 1 ? '' : 's'} across{' '}
                <strong>{importPreview.areas.length}</strong> area{importPreview.areas.length === 1 ? '' : 's'}:
              </div>
              <ul className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-3">
                {importPreview.areas.map((a) => (
                  <li key={a.name} className="flex justify-between gap-4">
                    <span className="truncate">{a.name}</span>
                    <span className="text-gray-500 shrink-0">{a.itemCount} item{a.itemCount === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
              {importPreview.skippedSheets.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800" data-testid="text-import-preview-skipped">
                  {importPreview.skippedSheets.length} tab{importPreview.skippedSheets.length > 1 ? 's' : ''} will be skipped
                  (no recognizable checklist rows): {importPreview.skippedSheets.join(', ')}.
                </div>
              )}
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
                Importing will <strong>permanently replace</strong> your organization's current checklist, including
                statuses, comments, AI findings, and attached evidence.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)} data-testid="button-cancel-file-import">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!importPreview) return;
                if (importPreview.source.kind === 'files') importFileMutation.mutate(importPreview.source.files);
                else importMutation.mutate(importPreview.source.text);
              }}
              disabled={importFileMutation.isPending || importMutation.isPending}
              data-testid="button-confirm-file-import"
            >
              {(importFileMutation.isPending || importMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Replace Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
