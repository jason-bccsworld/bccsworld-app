import { Button } from "@/components/ui/button";
import { Plus, Download, Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({ title, description }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-600">{description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button className="bg-aviation-blue hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Import
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
