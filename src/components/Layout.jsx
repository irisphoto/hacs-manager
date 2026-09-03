import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Store, Compass, Package, Settings, Link2, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: Store },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/installed", label: "Installed", icon: Package },
  { to: "/axle-solix", label: "Axle × Solix", icon: Link2 },
  { to: "/my-repos", label: "My Repos", icon: Github },
];

export default function Layout() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (mobile) */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/15"><Store className="h-4 w-4 text-sky-400" /></div>
          <span className="font-semibold text-foreground">HACS</span>
        </Link>
      </div>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border/60 min-h-[calc(100vh-3.5rem)] sticky top-0 h-screen p-4 gap-1">
          <Link to="/" className="flex items-center gap-2 px-2 py-2 mb-4">
            <div className="p-2 rounded-xl bg-sky-500/15"><Store className="h-5 w-5 text-sky-400" /></div>
            <div>
              <div className="font-semibold text-foreground leading-tight">HACS</div>
              <div className="text-[10px] text-muted-foreground">Community Store</div>
            </div>
          </Link>
          {NAV.map(item => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}>
                <Button variant="ghost" className={cn("w-full justify-start gap-2.5 h-9 text-sm font-normal", active && "bg-accent text-foreground")}>
                  <Icon className="h-4 w-4" /> {item.label}
                </Button>
              </Link>
            );
          })}
          <div className="mt-auto px-2 py-2 text-[10px] text-muted-foreground">
            Home Assistant Community Store
          </div>
        </aside>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur flex">
          {NAV.map(item => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={cn("flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px]", active ? "text-foreground" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" /> {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}