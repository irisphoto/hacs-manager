import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, Download, Clock, ExternalLink, ArrowLeft, Check, Loader2, Trash2, Tag, GitBranch } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const load = () => {
    base44.entities.HacsItem.get(id).then((data) => {
      setItem(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const install = async () => {
    if (!item) return;
    setActionLoading(true);
    try {
      const updated = await base44.entities.HacsItem.update(item.id, {
        installed: true,
        installed_version: item.version,
        downloads: (item.downloads || 0) + 1
      });
      setItem(updated);
      toast({ title: "Installed", description: `${item.name} has been installed.` });
    } catch (e) {
      toast({ title: "Install failed", description: "Could not install this item.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const uninstall = async () => {
    if (!item) return;
    setActionLoading(true);
    try {
      const updated = await base44.entities.HacsItem.update(item.id, {
        installed: false,
        installed_version: null
      });
      setItem(updated);
      toast({ title: "Removed", description: `${item.name} has been removed.` });
    } catch (e) {
      toast({ title: "Failed", description: "Could not remove this item.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-sm">Item not found.</p>
        <Link to="/explore"><Button variant="outline" size="sm" className="mt-4">Back to store</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/explore" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to store
      </Link>

      <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-16 w-16 rounded-xl shrink-0">
              <AvatarFallback className="rounded-xl bg-muted">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{item.name}</h1>
                {item.installed && <Badge variant="secondary" className="text-[10px]"><Check className="h-3 w-3 mr-1" />Installed</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <span>{item.author}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" />{item.stars?.toLocaleString()} stars</span>
                <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5 text-emerald-400" />{item.downloads?.toLocaleString()} downloads</span>
                {item.last_updated && (
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Updated {new Date(item.last_updated).toLocaleDateString()}</span>
                )}
                {item.version && (
                  <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />v{item.version}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {item.installed ? (
                  <Button variant="outline" size="sm" onClick={uninstall} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                    Remove
                  </Button>
                ) : (
                  <Button size="sm" onClick={install} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                    Install
                  </Button>
                )}
                <a href={item.repository_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-1.5" /> View on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <h2 className="text-sm font-medium text-foreground mb-2">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{item.description}</p>
          </div>

          {item.topics && item.topics.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-foreground mb-2">Topics</h2>
              <div className="flex flex-wrap gap-2">
                {item.topics.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            </div>
          )}

          {item.repo_full_name && (
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              <code className="px-1.5 py-0.5 rounded bg-muted">{item.repo_full_name}</code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}