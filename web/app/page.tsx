import { BountyHall } from "@/components/BountyHall";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <header className="hero">
        <h1 className="brand">
          Open<span>Tacker</span>
        </h1>
        <p className="lede">
          不只盯一个列表。自动从付费开源清单、GitHub 悬赏 Issue、Algora 等来源抓取任务；
          注册登录后，按你的技能与目标管理、收藏，并一键去接单。
        </p>
      </header>
      <BountyHall />
      <p className="footer">
        提示：首次使用请先注册/登录，再点「立即抓取网上悬赏」。智能匹配页仍可按项目画像选型。
      </p>
    </main>
  );
}
