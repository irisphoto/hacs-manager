import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Download, Search, SlidersHorizontal, Package, Palette, LayoutGrid, Code2 } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "integration", label: "Integrations" },
  { value: "theme", label: "Themes" },
  { value: "frontend", label: "Frontend" },
  { value: "appdaemon", label: "AppDaemon" },
  { value: "python_script", label: "Python Scripts" },
  { value: "template", label: "Templates" },
  { value: "script", label: "Scripts" }
];

const SORTS = [
  { value: "-stars", label: "Most stars" },
  { value: "-downloads", label: "Most downloads" },
  { value: "-updated_date", label: "Recently updated" },
  { value: "name", label: "Name (A-Z)" }
];

const CATEGORY_ICON = {
  integration: Package, theme: Palette, frontend: LayoutGrid,
  appdaemon: Code2, python_script: Code2, template: Code2, script: Code2
};

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState(searchParams.get("sort") || "-stars");

  useEffect(() => {
    base44.entities.HacsItem.list("-stars", 200).then((data) => {
      setItems(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = {};
    if (query) params.q = query;
    if (category !== "all") params.category = category;
    if (sort !== "-stars") params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [query, category, sort, setSearchParams]);

  const filtered = useMemo(() => {
    let result = items;
    if (category !== "all") result = result.filter(i => i.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.author?.toLowerCase().includes(q) ||
        i.topics?.some(t => t.toLowerCase().includes(q))
      );
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      if (sort === "name") return (a.name || "").localeCompare(b.name || "");
      if (sort === "-stars") return (b.stars || 0) - (a.stars || 0);
      if (sort === "-downloads") return (b.downloads || 0) - (a.downloads || 0);
      if (sort === "-updated_date") return new Date(b.last_updated || 0) - new Date(a.last_updated || 0);
      return 0;
    });
    return sorted;
  }, [items, category, query, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Explore</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse the community store of {items.length} items.</p>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations, themes, authors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-card/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-md border border-input bg-card/40 px-3 text-sm text-foreground"
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategory(c.value)}>
            <Badge
              variant={category === c.value ? "default" : "secondary"}
              className="cursor-pointer text-xs px-3 py-1"
            >
              {c.label}
            </Badge>
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          No items match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const Icon = CATEGORY_ICON[item.category] || Package;
            return (
              <Link key={item.id} to={`/item/${item.id}`}>
                <Card className="h-full bg-card/40 border-border/50 backdrop-blur-sm hover:border-border hover:bg-card/70 transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 rounded-lg"><AvatarFallback className="rounded-lg text-xs bg-muted">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                          {item.installed && <Badge variant="secondary" className="text-[10px]">Installed</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{item.author}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-3 min-h-[2rem]">{item.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        <span className="capitalize">{item.category?.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" />{item.stars?.toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{item.downloads?.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}