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
  BookOpen,
  Activity,
  ClipboardList,
  Archive,
  PenLine
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { path: "/dashboard", icon: BarChart3, label: "Compliance Dashboard" },
  { path: "/compliance-records", icon: Clock, label: "Training Records" },
  { path: "/students", icon: BookOpen, label: "Student Roster" },
  { path: "/instructors", icon: GraduationCap, label: "Instructor Records" },
  { path: "/safo-info", icon: Bell, label: "SAFO / InFO" },
  { path: "/audit-history", icon: Activity, label: "Audit History" },
  { path: "/compliance-report", icon: ClipboardList, label: "Compliance Report" },
  { path: "/compliance-checklist", icon: CheckCircle, label: "Part 142 Checklist" },
  { path: "/far-compliance", icon: Shield, label: "FAR Compliance" },
  { path: "/ai-audit-compliance", icon: Brain, label: "AI Audit Assistant", badge: "AI" },
  { path: "/regulatory-alerts", icon: AlertTriangle, label: "Regulatory Alerts" },
  { path: "/link-monitor", icon: ExternalLink, label: "Link Monitor" },
  { path: "/document-import", icon: FileText, label: "AI Document Import", badge: "AI" },
  { path: "/documents", icon: Database, label: "Document Library" },
  { path: "/faa-repository", icon: Archive, label: "FAA Repository", badge: "LIVE" },
  { path: "/digital-forms", icon: PenLine, label: "Digital Forms", badge: "NEW" },
  { path: "/document-generation", icon: FileText, label: "Document Generator" },
  { path: "/admin-dashboard", icon: Users, label: "User Management" },
  { path: "/organization-setup", icon: Globe, label: "Organization Setup" },
  { path: "/support", icon: HelpCircle, label: "Support" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();

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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                location === item.path
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                {item.label}
              </div>
              {item.badge && (
                <span className={`text-white text-xs px-2 py-1 rounded-full ${
                  item.badge === 'AI' ? 'bg-purple-500' : 
                  item.badge === 'P4' ? 'bg-blue-500' : 'bg-red-500'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 text-sm text-slate-400 flex-shrink-0">
          Enterprise Ready Platform
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}