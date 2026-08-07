import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Shield, 
  FileText, 
  Users, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  Clock,
  CheckCircle,
  Globe,
  Smartphone,
  HelpCircle,
  Bell,
  ExternalLink,
  Brain,
  Wrench,
  Plane,
  DollarSign,
  CreditCard,
  Lock,
  Database,
  Network,
  GraduationCap,
  Landmark,
  BookOpen,
  Activity,
  ClipboardList,
  Archive,
  PenLine,
  TrendingUp,
  LogOut,
  Bot,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLicense } from '@/hooks/useLicense';
import { useAuth } from '@/hooks/useAuth';
import OrgSwitcher from '@/components/org-switcher';
import TrialStatusBanner from '@/components/trial-status-banner';
import type { PlanFeatures } from '../../../shared/license';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  feature?: keyof PlanFeatures;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: "AI Agent Team",
    items: [
      { path: "/agents", icon: Bot, label: "Command Center", badge: "AI" },
      { path: "/documents", icon: Database, label: "Document Extraction" },
      { path: "/ml-training", icon: Brain, label: "Extraction Learning" },
      { path: "/regulatory-alerts", icon: AlertTriangle, label: "Regulatory Monitor" },
      { path: "/faa-repository", icon: Archive, label: "FAA Repository", badge: "LIVE" },
      { path: "/link-monitor", icon: ExternalLink, label: "Link Integrity" },
      { path: "/federal-contracts", icon: Landmark, label: "Federal Contracts", badge: "NEW" },
    ],
  },
  {
    title: "Records & Data",
    items: [
      { path: "/dashboard", icon: BarChart3, label: "Compliance Dashboard" },
      { path: "/compliance-records", icon: Clock, label: "Training Records" },
      { path: "/students", icon: BookOpen, label: "Student Roster" },
      { path: "/instructors", icon: GraduationCap, label: "Instructor Roster" },
      { path: "/safo-info", icon: Bell, label: "SAFO / InFO" },
      { path: "/audit-history", icon: Activity, label: "Audit History" },
      { path: "/compliance-report", icon: ClipboardList, label: "Compliance Report", feature: "complianceReports" },
      { path: "/compliance-checklist", icon: CheckCircle, label: "Part 142 Checklist" },
      { path: "/far-compliance", icon: Shield, label: "FAR Compliance" },
      { path: "/ai-audit-compliance", icon: Brain, label: "AI Audit Assistant", badge: "AI", feature: "aiDocumentProcessing" },
      { path: "/analytics-dashboard", icon: TrendingUp, label: "Analytics Dashboard", feature: "advancedAnalytics" },
      { path: "/digital-forms", icon: PenLine, label: "Digital Forms" },
      { path: "/document-generation", icon: FileText, label: "Document Generator" },
      { path: "/admin-dashboard", icon: Users, label: "User Management" },
      { path: "/organization-setup", icon: Globe, label: "Organization Setup" },
      { path: "/support", icon: HelpCircle, label: "Support" },
      { path: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { canUse, isLoading: licenseLoading } = useLicense();
  const { user } = useAuth() as { user: { firstName?: string; lastName?: string; email?: string } | null };
  const { data: tenant } = useQuery<{ isPlatformStaff?: boolean }>({ queryKey: ["/api/session/tenant"] });
  const isStaff = !!tenant?.isPlatformStaff;

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Even if the request fails, fall through to a hard reload so the
      // client never stays in a half-logged-in state.
    }
    window.location.href = '/login';
  };

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Signed in'
    : '';

  return (
    <div className="dashboard-layout-new">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col h-screen">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-blue-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Plane size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BCCS-US</h1>
              <p className="text-sm text-blue-100">Aviation Compliance Platform</p>
            </div>
          </div>
        </div>

        {/* Active organization / switcher (multi-tenant mode only) */}
        <OrgSwitcher />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {navigationSections.map((section) => (
          <div key={section.title}>
          <p className="px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {section.title}
          </p>
          <div className="space-y-1">
          {section.items.filter((item) => item.path !== "/organization-setup" || isStaff).map((item) => {
            const isActive = location === item.path;
            const isLocked = !licenseLoading && item.feature ? !canUse(item.feature) : false;

            return (
              <Link
                key={`${section.title}-${item.path}`}
                href={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isLocked
                    ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={isLocked ? 'opacity-50' : ''} />
                  <span className={isLocked ? 'opacity-60' : ''}>{item.label}</span>
                </div>
                {isLocked ? (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                    <Lock size={9} />
                    Upgrade
                  </span>
                ) : item.badge ? (
                  <span className={`text-white text-xs px-2 py-1 rounded-full ${
                    item.badge === 'AI' ? 'bg-purple-500' :
                    item.badge === 'P4' ? 'bg-blue-500' : 'bg-red-500'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
          </div>
          </div>
          ))}
        </nav>

        {/* Footer: signed-in user + logout */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          {user && (
            <div className="mb-3 min-w-0">
              <p className="text-sm text-white truncate" data-testid="text-user-name">{displayName}</p>
              {user.email && (
                <p className="text-xs text-slate-400 truncate" data-testid="text-user-email">{user.email}</p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            data-testid="button-logout"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-700"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TrialStatusBanner />
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
