import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, Trash2, Package, Search, ArrowRight, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Installed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    base44.entities.HacsItem.filter({ installed: true }, "-updated_date", 200).then((data) => {
      setItems(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const uninstall = async (item) => {
    try {
      await base44.entities.HacsItem.update(item.id, { installed: false, installed_version: null });
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "Removed", description: `${item.name} has been removed.` });
    } catch (e) {
      toast({ title: "Failed", description: "Could not remove this item.", variant: "destructive" });
    }
  };

  const filtered = items.filter(i =>
    !query.trim() || i.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Installed</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} item{items.length !== 1 ? "s" : ""} installed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search installed items…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-card/40 max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{query ? "No matches." : "Nothing installed yet."}</p>
            {!query && (
              <Link to="/explore">
                <Button size="sm" className="mt-4">Browse store <ArrowRight className="h-4 w-4 ml-1.5" /></Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <Card key={item.id} className="bg-card/40 border-border/50 backdrop-blur-sm hover:border-border transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10 rounded-lg shrink-0"><AvatarFallback className="rounded-lg text-xs bg-muted">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/item/${item.id}`} className="text-sm font-medium text-foreground hover:underline truncate">{item.name}</Link>
                    {item.installed_version && <Badge variant="secondary" className="text-[10px]">v{item.installed_version}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{item.author} · {item.category?.replace("_", " ")}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={item.repository_url} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => uninstall(item)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}