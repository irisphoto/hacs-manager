import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const VALID_CATEGORIES = ["integration", "theme", "frontend", "appdaemon", "python_script", "template", "script"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { repo_full_name, category } = await req.json();
    if (!repo_full_name || !repo_full_name.includes("/")) {
      return Response.json({ error: 'repo_full_name is required (owner/repo)' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return Response.json({ error: 'Invalid category' }, { status: 400 });
    }

    const existing = await base44.entities.HacsItem.filter({ repo_full_name });
    if (existing.length > 0) {
      return Response.json({ error: 'This repository is already in the store' }, { status: 409 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const repoRes = await fetch(`https://api.github.com/repos/${repo_full_name}`, { headers });
    if (!repoRes.ok) {
      return Response.json({ error: `GitHub API error: ${repoRes.status}` }, { status: 502 });
    }
    const repo = await repoRes.json();

    let version = null;
    const relRes = await fetch(`https://api.github.com/repos/${repo_full_name}/releases/latest`, { headers });
    if (relRes.ok) {
      const release = await relRes.json();
      version = release.tag_name || null;
    }

    const item = await base44.entities.HacsItem.create({
      name: repo.name,
      description: repo.description || "",
      category,
      author: repo.owner ? repo.owner.login : repo_full_name.split("/")[0],
      repo_full_name: repo.full_name,
      repository_url: repo.html_url,
      stars: repo.stargazers_count || 0,
      last_updated: repo.pushed_at,
      version,
      topics: repo.topics || [],
    });

    return Response.json({ item });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}