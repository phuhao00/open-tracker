export const SOURCE_LABEL: Record<string, string> = {
  paid_list: "付费列表",
  github_search: "GitHub",
  algora: "Algora",
  remoteok: "RemoteOK",
  remotive: "Remotive",
  jobicy: "Jobicy",
  arbeitnow: "Arbeitnow",
  portal_directory: "门户入口",
  community: "社区发布",
};

export const KIND_LABEL: Record<string, string> = {
  bounty: "悬赏",
  opportunity: "协作机会",
  job: "远程全职/岗位",
  parttime: "兼职/灵活",
  portal: "门户入口",
};

export const KIND_FILTERS = [
  { id: "", label: "全部类型" },
  { id: "portal", label: "门户入口" },
  { id: "parttime", label: "兼职/灵活" },
  { id: "job", label: "远程岗位" },
  { id: "opportunity", label: "协作机会" },
  { id: "bounty", label: "开源悬赏" },
] as const;
