import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Rocket,
  FolderKanban,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
  { label: "Studies", to: "/studies", icon: BookOpen },
  { label: "Startup", to: "/startup", icon: Rocket },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
];

const AppSidebar = () => {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-sidebar-border bg-sidebar-background transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 h-16 border-b border-sidebar-border", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 glow-sm">
          <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-semibold text-sm tracking-tight text-sidebar-accent-foreground">D.O.P.E</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150",
              collapsed && "justify-center px-2"
            )}
            activeClassName="bg-sidebar-accent text-primary"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("p-2 border-t border-sidebar-border", collapsed && "flex justify-center")}>
        <button
          onClick={signOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive transition-all duration-150 w-full",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar-background border border-sidebar-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
