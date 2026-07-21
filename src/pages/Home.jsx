import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Download, Clock, ArrowRight, TrendingUp, Package, LayoutGrid, Palette, Code2 } from "lucide-react";

const CATEGORY_META = {
  integration: { label: "Integrations", icon: Package, color: "text-sky-400", bg: "bg-sky-500/10" },
  theme: { label: "Themes", icon: Palette, color: "text-violet-400", bg: "bg-violet-500/10" },
  frontend: { label: "Frontend", icon: LayoutGrid, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  appdaemon: { label: "AppDaemon", icon: Code2, color: "text-amber-400", bg: "bg-amber-500/10" },
  python_script: { label: "Python Scripts", icon: Code2, color: "text-rose-400", bg: "bg-rose-500/10" },
  template: { label: "Templates", icon: Code2, color: "text-teal-400", bg: "bg-teal-500/10" },
  script: { label: "Scripts", icon: Code2, color: "text-indigo-400", bg: "bg-indigo-500/10" }
};

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryCard({ category, count, onClick }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <button onClick={onClick} className="group text-left">
      <Card className="bg-card/40 border-border/50 backdrop-blur-sm hover:border-border hover:bg-card/70 transition-all duration-200">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${meta.bg}`}>
              <Icon className={`h-4 w-4 ${meta.color}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{meta.label}</div>
              <div className="text-xs text-muted-foreground">{count} items</div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </CardContent>
      </Card>
    </button>
  );
}

function FeaturedCard({ item }) {
  const meta = CATEGORY_META[item.category];
  const Icon = meta ? meta.icon : Package;
  return (
    <Link to={`/item/${item.id}`}>
      <Card className="h-full bg-card/40 border-border/50 backdrop-blur-sm hover:border-border hover:bg-card/70 transition-all duration-200 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`p-2 rounded-lg ${meta?.bg || "bg-sky-500/10"}`}>
              <Icon className={`h-4 w-4 ${meta?.color || "text-sky-400"}`} />
            </div>
            {item.installed && <Badge variant="secondary" className="text-[10px]">Installed</Badge>}
          </div>
          <h3 className="font-medium text-foreground truncate">{item.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">{item.description}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="h-3 w-3" />{item.stars?.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Download className="h-3 w-3" />{item.downloads?.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.HacsItem.list("-stars", 100).then((data) => {
      setItems(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const installed = items.filter(i => i.installed).length;
    const totalStars = items.reduce((s, i) => s + (i.stars || 0), 0);
    const totalDownloads = items.reduce((s, i) => s + (i.downloads || 0), 0);
    return { total: items.length, installed, totalStars, totalDownloads };
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, [items]);

  const featured = useMemo(() => items.filter(i => i.featured).slice(0, 6), [items]);
  const trending = useMemo(() => [...items].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 5), [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-sky-500/10 via-card/30 to-violet-500/10 p-8 md:p-10">
        <div className="relative z-10 max-w-2xl">
          <Badge variant="secondary" className="mb-3 text-[11px]">Community Store</Badge>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            Home Assistant Community Store
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base leading-relaxed">
            Discover and install community-made integrations, themes, and frontend modules for your Home Assistant instance.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link to="/explore"><Button size="sm">Browse store</Button></Link>
            <Link to="/installed"><Button size="sm" variant="outline">Manage installed</Button></Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Available items" value={stats.total.toLocaleString()} color="text-sky-400" bg="bg-sky-500/10" />
        <StatCard icon={Download} label="Total downloads" value={stats.totalDownloads.toLocaleString()} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={Star} label="GitHub stars" value={stats.totalStars.toLocaleString()} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard icon={TrendingUp} label="Installed" value={stats.installed.toLocaleString()} color="text-violet-400" bg="bg-violet-500/10" />
      </div>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Categories</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.keys(CATEGORY_META).filter(c => categoryCounts[c]).map(cat => (
            <CategoryCard key={cat} category={cat} count={categoryCounts[cat]} onClick={() => {
              window.location.href = `/explore?category=${cat}`;
            }} />
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Featured</h2>
            <Link to="/explore" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map(item => <FeaturedCard key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Trending
            </h2>
          </div>
          <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
            <CardContent className="p-0 divide-y divide-border/40">
              {trending.map((item, idx) => {
                const meta = CATEGORY_META[item.category];
                return (
                  <Link key={item.id} to={`/item/${item.id}`} className="flex items-center gap-4 p-4 hover:bg-accent/40 transition-colors">
                    <span className="text-sm font-medium text-muted-foreground w-5 tabular-nums">{idx + 1}</span>
                    <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-muted">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.author}</div>
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">{meta?.label}</Badge>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" />{item.downloads?.toLocaleString()}</span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}