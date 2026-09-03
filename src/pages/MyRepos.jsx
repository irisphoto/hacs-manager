import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Github, Search, Star, Plus, Loader2, ExternalLink, Check } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

const CATEGORIES = [
  { value: "integration", label: "Integration" },
  { value: "theme", label: "Theme" },
  { value: "frontend", label: "Frontend" },
  { value: "appdaemon", label: "AppDaemon" },
  { value: "python_script", label: "Python Script" },
  { value: "template", label: "Template" },
  { value: "script", label: "Script" },
];

function RepoCard({ repo, onAdd, isAdding, isAdded }) {
  const [category, setCategory] = useState("integration");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-slate-500/10 shrink-0">
              <Github className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{repo.full_name}</div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {repo.description || "No description"}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                {repo.language && <span>{repo.language}</span>}
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" /> {repo.stars}
                </span>
                {repo.pushed_at && (
                  <span>Updated {formatDistanceToNow(parseISO(repo.pushed_at), { addSuffix: true })}</span>
                )}
              </div>
            </div>
          </div>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0 mt-1"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="flex-1 h-9"
            disabled={isAdding || isAdded}
            onClick={() => onAdd(repo, category)}
          >
            {isAdded ? (
              <>
                <Check className="h-4 w-4" /> In store
              </>
            ) : isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Adding…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add to store
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyRepos() {
  const { toast } = useToast();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(null);
  const [added, setAdded] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke("listMyGithubRepos", {});
        setRepos(res.data?.repos || []);
      } catch (e) {
        setError("Could not load your GitHub repositories.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
    );
  }, [repos, search]);

  const handleAdd = async (repo, category) => {
    setAdding(repo.full_name);
    try {
      await base44.functions.invoke("addRepoToHacsStore", {
        repo_full_name: repo.full_name,
        category,
      });
      setAdded((prev) => ({ ...prev, [repo.full_name]: true }));
      toast({
        title: "Added to store",
        description: `${repo.name} is now listed in your HACS store.`,
      });
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Could not add repository.";
      toast({
        title: "Could not add repository",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-heading text-foreground">My Repositories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse your GitHub repositories and add them to the HACS store.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {search ? "No repositories match your search." : "No repositories found in your GitHub account."}
          </CardContent>
        </Card>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {repos.length} repositories
          </p>
          <div className="space-y-3">
            {filtered.map((repo) => (
              <RepoCard
                key={repo.full_name}
                repo={repo}
                onAdd={handleAdd}
                isAdding={adding === repo.full_name}
                isAdded={!!added[repo.full_name]}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}