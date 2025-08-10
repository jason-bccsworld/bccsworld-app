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
  Network
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { path: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { path: "/aircraft-registry", icon: Plane, label: "Aircraft Registry", badge: "New" },
  { path: "/insurance-marketplace", icon: Shield, label: "Insurance Marketplace", badge: "New" },
  { path: "/maintenance-marketplace", icon: Wrench, label: "Maintenance Services", badge: "New" },
  { path: "/finance-marketplace", icon: CreditCard, label: "Finance Platform", badge: "New" },
  { path: "/crypto-subscriptions", icon: DollarSign, label: "Crypto Subscriptions", badge: "New" },
  { path: "/key-management", icon: Shield, label: "Key Management", badge: "New" },
  { path: "/advanced-key-recovery", icon: Lock, label: "Key Recovery", badge: "New" },
  { path: "/legacy-data-transfer", icon: Database, label: "Pilot Logbook App", badge: "$149" },
  { path: "/multi-platform-integration", icon: Network, label: "Platform Integration", badge: "New" },
  { path: "/far-compliance", icon: CheckCircle, label: "FAR Compliance" },
  { path: "/ai-audit-compliance", icon: Brain, label: "Audit Assistant", badge: "AA" },
  { path: "/document-generation", icon: FileText, label: "Document Generation", badge: "New" },
  { path: "/bccsmaint", icon: Wrench, label: "BCCSMaint", badge: "NEW" },
  { path: "/compliance-checklist", icon: Shield, label: "Part 142 Checklist", badge: "New" },
  { path: "/regulatory-compliance", icon: AlertTriangle, label: "Regulatory Monitor" },
  { path: "/regulatory-alerts", icon: Bell, label: "Regulatory Alerts", badge: "2" },
  { path: "/link-monitor", icon: ExternalLink, label: "Link Monitor" },
  { path: "/document-import", icon: FileText, label: "Document Import" },
  { path: "/compliance-records", icon: Clock, label: "Compliance Records" },
  { path: "/admin-dashboard", icon: Users, label: "Admin Dashboard" },
  { path: "/mobile-field", icon: Smartphone, label: "Mobile Field" },
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
              <h1 className="text-xl font-bold">BCCS Aircraft Registry</h1>
              <p className="text-sm text-blue-100">Tokenization Platform</p>
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
                  item.badge === 'AI' ? 'bg-purple-500' : 'bg-red-500'
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