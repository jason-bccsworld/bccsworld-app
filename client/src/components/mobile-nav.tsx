import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Camera, 
  FileText, 
  Settings, 
  Menu, 
  X,
  Upload,
  BarChart
} from "lucide-react";

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/mobile-field", label: "Field Ops", icon: Camera },
    { path: "/document-import", label: "Upload", icon: Upload },
    { path: "/compliance-records", label: "Records", icon: FileText },
    { path: "/ml-training", label: "Analytics", icon: BarChart },
  ];

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
        <div className="flex justify-around items-center py-2">
          {navItems.slice(0, 4).map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col items-center p-2 h-auto min-w-0 ${
                  isActive(item.path) ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Button>
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center p-2 h-auto min-w-0 text-gray-500"
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-xs">More</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Menu</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              
              <hr className="my-4" />
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/api/logout";
                }}
              >
                <Settings className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}