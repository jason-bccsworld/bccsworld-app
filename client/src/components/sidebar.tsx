import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/../../shared/schema";
import { 
  Shield, 
  Home, 
  Upload, 
  FileText, 
  History, 
  Settings, 
  LogOut,
  Users,
  Building,
  UserCheck,
  Brain,
  TrendingUp,
  Cable,
  Scale,
  Database
} from "lucide-react";

// Navigation menu with FAR Compliance access - prioritized order
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "FAR Compliance", href: "/far-compliance", icon: Shield },
  { name: "Document Import", href: "/document-import", icon: Upload },
  { name: "Compliance Records", href: "/compliance-records", icon: FileText },
  { name: "Audit Trail", href: "/audit-trail", icon: History },
  { name: "ML Training", href: "/ml-training", icon: Brain },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "Integrations", href: "/integrations", icon: Cable },
  { name: "Regulatory Monitor", href: "/regulatory-compliance", icon: Scale },
  { name: "FAR Field Mapping", href: "/field-mapping", icon: Database },
  { name: "System Configuration", href: "/system-config", icon: Settings },
];

const dashboardTypes = [
  { name: "Admin Dashboard", href: "/admin-dashboard", icon: Settings },
  { name: "Flight School", href: "/flight-school-dashboard", icon: Building },
  { name: "Regulator", href: "/regulator-dashboard", icon: UserCheck },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Type the user object properly to fix TypeScript errors
  const typedUser = user as any;

  return (
    <nav className="w-64 bg-deep-navy text-white flex-shrink-0 flex flex-col" style={{ height: '100vh', border: '5px solid red', boxSizing: 'border-box' }}>
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-aviation-blue rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">BCCS142</h1>
            <p className="text-slate-400 text-sm">Aviation Compliance v2</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto min-h-0">
        {typedUser && (
          <div className="mb-6">
            <div className="flex items-center space-x-3 p-3 bg-slate-800 rounded-lg">
              {typedUser.profileImageUrl ? (
                <img 
                  src={typedUser.profileImageUrl} 
                  alt="User profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-aviation-blue rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {typedUser.firstName?.[0] || typedUser.email?.[0] || "U"}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-sm">
                  {typedUser.firstName && typedUser.lastName 
                    ? `${typedUser.firstName} ${typedUser.lastName}`
                    : typedUser.email
                  }
                </p>
                <p className="text-slate-400 text-xs capitalize">{typedUser.role}</p>
              </div>
            </div>
          </div>
        )}
        
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                    isActive 
                      ? "bg-aviation-blue text-white" 
                      : "hover:bg-slate-800"
                  )}>
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}


        </ul>

        {/* Dashboard Types Section */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Dashboard Views
          </h3>
          <ul className="space-y-2">
            {dashboardTypes.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <a className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                      isActive 
                        ? "bg-aviation-blue text-white" 
                        : "hover:bg-slate-800"
                    )}>
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        
        <div className="mt-8 pt-4 border-t border-slate-700 pb-6">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={() => window.location.href = "/api/logout"}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
