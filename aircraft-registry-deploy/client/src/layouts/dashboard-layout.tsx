import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Shield, 
  Wrench,
  Plane,
  DollarSign,
  CreditCard
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { path: "/aircraft-registry", icon: Plane, label: "Aircraft Registry" },
  { path: "/insurance-marketplace", icon: Shield, label: "Insurance Marketplace" },
  { path: "/maintenance-marketplace", icon: Wrench, label: "Maintenance Services" },
  { path: "/finance-marketplace", icon: CreditCard, label: "Finance Platform" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-slate-200 fixed h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">BCCS Aircraft Registry</h1>
              <p className="text-sm text-slate-600">Global Aviation Finance</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}>
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <main className="p-0">
          {children}
        </main>
      </div>
    </div>
  );
}