import type { BountyListItem } from "@/lib/bounties-list";

/** 按来源 / 类型给出简短上手与结算提示（不依赖 Python tracker 画像） */
export function coachTipsForTask(item: Pick<
  BountyListItem,
  "kind" | "source" | "amountText" | "amountMax" | "engagementType"
>): { settlement: string; howTo: string; clarity: "clear" | "partial" | "unclear" } {
  const key = item.source.key;
  const kind = item.kind;

  if (key === "algora" || (kind === "bounty" && key === "github_search")) {
    return {
      clarity: "clear",
      settlement: "悬赏类通常在源站或 Algora 标明金额与领取规则，结算路径相对清晰。",
      howTo: "打开源站确认 bounty 仍开放，再在本站认领避免撞车，按 issue 要求提交 PR。",
    };
  }
  if (key === "community") {
    return {
      clarity: item.amountText ? "partial" : "unclear",
      settlement: item.amountText
        ? "社区帖自填报酬，请与发布方确认支付方式与验收标准后再开工。"
        : "社区帖可能未写死金额，先沟通范围与结算再动手。",
      howTo: "查看详情页联系方式或发布者主页，确认交付物与时间后再认领。",
    };
  }
  if (kind === "portal") {
    return {
      clarity: "partial",
      settlement: "门户入口仅作跳转，薪资与合同以源站为准。",
      howTo: "进入招聘入口浏览岗位，投递在源站完成；本站可收藏以便回访。",
    };
  }
  if (kind === "job" || kind === "parttime") {
    return {
      clarity: item.amountText || item.amountMax ? "partial" : "unclear",
      settlement: "远程/兼职岗位金额多为公开区间，入职与发薪在招聘方侧完成。",
      howTo: "打开源站投递；若适合协作可先在本站认领标记「我在跟进」。",
    };
  }
  return {
    clarity: item.amountText ? "partial" : "unclear",
    settlement: "请到源站核对报酬、币种与付款条件。",
    howTo: "先读摘要与标签，确认技能匹配后打开详情或源站行动。",
  };
}

export function clarityLabel(c: "clear" | "partial" | "unclear") {
  if (c === "clear") return { text: "结算较清晰", tone: "good" as const };
  if (c === "partial") return { text: "需再确认", tone: "warn" as const };
  return { text: "结算不明", tone: "bad" as const };
}
