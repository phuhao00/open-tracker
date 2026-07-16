import { extractGithubUsername } from "@/lib/profile-media";

export { extractGithubUsername };

export type GithubPublicProfile = {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  htmlUrl: string;
  company: string | null;
  location: string | null;
  blog: string | null;
  twitterUsername: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
};

export type GithubPublicRepo = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
};

export type GithubEmbedPayload = {
  profile: GithubPublicProfile;
  repos: GithubPublicRepo[];
};

export async function fetchGithubEmbed(login: string): Promise<GithubEmbedPayload | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "opentacker-profile",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers,
    next: { revalidate: 3600 },
  });
  if (userRes.status === 404) return null;
  if (!userRes.ok) {
    throw new Error(`GitHub 用户接口失败（${userRes.status}）`);
  }
  const user = (await userRes.json()) as {
    login: string;
    name: string | null;
    bio: string | null;
    avatar_url: string;
    html_url: string;
    company: string | null;
    location: string | null;
    blog: string | null;
    twitter_username: string | null;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
  };

  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(login)}/repos?sort=updated&per_page=6&type=owner`,
    { headers, next: { revalidate: 3600 } },
  );
  const reposRaw = reposRes.ok
    ? ((await reposRes.json()) as Array<{
        id: number;
        name: string;
        full_name: string;
        html_url: string;
        description: string | null;
        language: string | null;
        stargazers_count: number;
        forks_count: number;
        updated_at: string;
        fork: boolean;
      }>)
    : [];

  const repos = reposRaw
    .filter((r) => !r.fork)
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      description: r.description,
      language: r.language,
      stargazersCount: r.stargazers_count,
      forksCount: r.forks_count,
      updatedAt: r.updated_at,
    }));

  const finalRepos =
    repos.length > 0
      ? repos
      : reposRaw.slice(0, 4).map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          htmlUrl: r.html_url,
          description: r.description,
          language: r.language,
          stargazersCount: r.stargazers_count,
          forksCount: r.forks_count,
          updatedAt: r.updated_at,
        }));

  return {
    profile: {
      login: user.login,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
      company: user.company,
      location: user.location,
      blog: user.blog,
      twitterUsername: user.twitter_username,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      createdAt: user.created_at,
    },
    repos: finalRepos,
  };
}
