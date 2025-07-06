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
  MessageSquare
} from 'lucide-react';

interface SidebarProProps {
  className?: string;
}

export default function SidebarPro({ className }: SidebarProProps) {
  const [location] = useLocation();

  const menuItems = [
    {
      section: "Core Functions",
      items: [
        { path: "/dashboard", icon: BarChart3, label: "Dashboard", active: location === "/dashboard" },
        { path: "/far-compliance", icon: CheckCircle, label: "FAR Compliance", active: location === "/far-compliance" },
        { path: "/regulatory-compliance", icon: AlertTriangle, label: "Regulatory Monitor", active: location === "/regulatory-compliance" },
        { path: "/training-events", icon: Clock, label: "Training Events", active: location === "/training-events" },
      ]
    },
    {
      section: "Management",
      items: [
        { path: "/documents", icon: FileText, label: "Documents", active: location === "/documents" },
        { path: "/users", icon: Users, label: "Users", active: location === "/users" },
        { path: "/integrations", icon: Globe, label: "Integrations", active: location === "/integrations" },
      ]
    },
    {
      section: "Mobile & Support",
      items: [
        { path: "/mobile-field", icon: Smartphone, label: "Mobile Field", active: location === "/mobile-field" },
        { path: "/support", icon: HelpCircle, label: "Support", active: location === "/support" },
        { path: "/settings", icon: Settings, label: "Settings", active: location === "/settings" },
      ]
    }
  ];

  return (
    <div className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white shadow-lg z-50 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-blue-600">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white bg-opacity-20 rounded-lg">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">BCCS142</h1>
            <p className="text-sm text-blue-100">Aviation Compliance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
              {section.section}
            </h3>
            <nav className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    item.active 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <MessageSquare size={16} />
          <span>Enterprise Ready</span>
        </div>
      </div>
    </div>
  );
}