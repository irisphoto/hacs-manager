import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("github");

    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&type=owner",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "home-mod-hub",
        },
      }
    );
    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = body.message || "";
      } catch (e) {
        detail = "";
      }
      return Response.json({ error: `GitHub API error: ${response.status}: ${detail}` }, { status: 502 });
    }
    const repos = await response.json();

    let login = null;
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "home-mod-hub",
      },
    });
    if (userRes.ok) {
      const ghUser = await userRes.json();
      login = ghUser.login;
    }

    const result = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || "",
      html_url: repo.html_url,
      stars: repo.stargazers_count,
      topics: repo.topics || [],
      pushed_at: repo.pushed_at,
      language: repo.language,
    }));

    return Response.json({ login, repos: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}