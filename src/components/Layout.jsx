import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, ClipboardList, Target, MapPin, Gift, ScanLine, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from './Logo';

const navItems = [
  { path: "/", label: "Garden", icon: Home },
  { path: "/log", label: "Log", icon: ClipboardList },
  { path: "/plant", label: "Plant", icon: Target },
  { path: "/oasis", label: "Oasis", icon: MapPin },
  { path: "/harvest", label: "Harvest", icon: Gift },
  { path: "/glean", label: "Glean", icon: ScanLine },
  { path: "/account", label: "Account", icon: ShieldCheck },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex flex-col w-64 bg-sidebar min-h-screen fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" /> 
              <div>
              <p className="font-display font-semibold text-sidebar-foreground text-lg leading-tight">sykle</p>
              <p className="text-xs text-sidebar-foreground/50">UAE</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 text-center">12C Group 3: 💜, 💙, ❤️, 🩷</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-xl">
        <div className="flex items-center justify-around py-2 pb-safe">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn("p-1.5 rounded-lg transition-all", isActive && "bg-teal-light")}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}