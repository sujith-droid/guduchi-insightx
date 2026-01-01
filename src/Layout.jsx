import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  Package, 
  Megaphone, 
  ClipboardList, 
  FileText,
  Settings,
  Menu,
  X,
  ChevronDown,
  Building2,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import AccessDenied from "./components/AccessDenied";

const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard", departments: ["Analyst"], analystAdminOnly: true },
  { name: "Reception", icon: Users, page: "Reception", departments: ["Analyst", "Reception"] },
  { name: "Customer Support", icon: Phone, page: "CustomerSupport", departments: ["Analyst", "Customer Support"] },
  { name: "Pharmacy", icon: Package, page: "Pharmacy", departments: ["Analyst", "Pharmacy"] },
  { name: "Digital Marketing", icon: Megaphone, page: "Marketing", departments: ["Analyst", "Digital Marketing"] },
  { name: "Center Manager", icon: ClipboardList, page: "CenterManager", departments: ["Analyst", "Center Manager"] },
  { name: "Reports", icon: FileText, page: "Reports", departments: ["Analyst"], analystAdminOnly: true },
  { name: "User Management", icon: Users, page: "UserManagement", adminOnly: true },
  { name: "Help", icon: FileText, page: "Help", alwaysShow: true },
  { name: "Settings", icon: Settings, page: "Settings", alwaysShow: true },
];

const canAccessPage = (item, user) => {
  if (item.alwaysShow) return true;
  if (user?.department === "CEO") return true;
  if (item.adminOnly) return user?.role === "admin";
  if (item.analystAdminOnly) {
    return user?.role === "admin" || user?.department === "Analyst";
  }
  if (!user?.department || !user?.branch) return false;
  if (!item.departments) return true;
  return item.departments.includes(user.department);
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        // Not logged in
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Check if user has access to current page
  const hasAccess = () => {
    if (!currentUser) return false;
    
    // Always allow access to Settings and Help pages
    if (currentPageName === "Settings" || currentPageName === "Help") return true;
    
    // Admin, CEO, and Analyst always have access
    if (currentUser.role === "admin" || currentUser.department === "CEO" || currentUser.department === "Analyst") return true;
    
    // Check if user has branch and department assigned
    if (!currentUser.branch || !currentUser.department) return false;
    
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">BranchIQ</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-indigo-100 text-indigo-600 text-sm">
                  {currentUser?.full_name?.[0] || currentUser?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{currentUser?.full_name || currentUser?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={createPageUrl("Settings")}>Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40 transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-slate-900">BranchIQ</span>
            <p className="text-xs text-slate-400">Analytics Hub</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.filter(item => canAccessPage(item, currentUser)).map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600">
                    {currentUser?.full_name?.[0] || currentUser?.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {currentUser?.full_name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {currentUser?.department || "No department"}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{currentUser?.full_name}</p>
                <p className="text-xs text-slate-500">{currentUser?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("Settings")} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {currentUser && !hasAccess() ? <AccessDenied /> : children}
      </main>
    </div>
  );
}