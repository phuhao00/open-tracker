export type Opportunity = {
  kind: string;
  kind_zh: string;
  score: number;
  title: string;
  url: string;
  labels: string[];
  updated_at: string;
  comments: number;
  reasons: string[];
  payment: string;
  repo: string;
};

export type ProjectSnapshot = {
  full_name: string;
  stars: number;
  open_issues: number;
  language: string | null;
  pushed_at: string | null;
  topics: string[];
  error: string | null;
  releases: Array<{
    tag: string | null;
    name: string | null;
    url: string | null;
    published_at: string | null;
    prerelease: boolean;
  }>;
};

export type ProjectRecord = {
  name: string;
  description: string;
  link: string;
  tech: string[];
  payment: string;
  getting_started: string;
  github: string | null;
  notes: string[];
  snapshot: ProjectSnapshot | null;
  opportunities: Opportunity[];
};

export type TrackingSnapshot = {
  generated_at: string;
  project_count: number;
  projects: ProjectRecord[];
};

export type FlatOpportunity = Opportunity & {
  project: string;
  tech: string[];
};
