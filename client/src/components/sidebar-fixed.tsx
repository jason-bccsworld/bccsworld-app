import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  Home, 
  Upload, 
  FileText, 
  History, 
  Settings, 
  LogOut,
  Brain,
  TrendingUp,
  Cable,
  Scale,
  Database
} from "lucide-react";

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

export default function SidebarFixed() {
  const [location] = useLocation();
  const { user } = useAuth();
  const typedUser = user as any;

  return (
    <div 
      style={{ 
        position: 'fixed',
        left: 0,
        top: 0,
        width: '256px',
        height: '100vh',
        backgroundColor: 'hsl(222, 84%, 4.9%)',
        color: 'white',
        overflowY: 'auto',
        zIndex: 10,
        border: '3px solid yellow'
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid rgb(51 65 85)', backgroundColor: 'rgb(37 99 235)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            backgroundColor: 'hsl(222, 84%, 53%)', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Shield size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>BCCS142</h1>
            <p style={{ fontSize: '14px', color: 'rgb(148 163 184)', margin: 0 }}>WORKING SIDEBAR</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div style={{ padding: '16px' }}>
        {typedUser && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
              backgroundColor: 'rgb(30 41 59)', 
              borderRadius: '8px' 
            }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: 'hsl(222, 84%, 53%)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {typedUser.firstName?.[0] || typedUser.email?.[0] || "U"}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                  {typedUser.firstName && typedUser.lastName 
                    ? `${typedUser.firstName} ${typedUser.lastName}`
                    : typedUser.email
                  }
                </p>
                <p style={{ fontSize: '12px', color: 'rgb(148 163 184)', margin: 0, textTransform: 'capitalize' }}>
                  {typedUser.role || 'Viewer'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div style={{ marginBottom: '24px' }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <a style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: 'white',
                  backgroundColor: isActive ? 'hsl(222, 84%, 53%)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.target.style.backgroundColor = 'rgb(30 41 59)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.target.style.backgroundColor = 'transparent';
                }}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                </a>
              </Link>
            );
          })}
        </div>
        
        <div style={{ paddingTop: '16px', borderTop: '1px solid rgb(51 65 85)' }}>
          <button
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'rgb(203 213 225)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => window.location.href = "/api/logout"}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgb(30 41 59)';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = 'rgb(203 213 225)';
            }}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}