import { MatchWorkspace } from "@/components/MatchWorkspace";
import { loadSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await loadSnapshot();

  return (
    <main className="shell">
      <header className="hero">
        <h1 className="brand">
          Open<span>Tacker</span>
        </h1>
        <p className="lede">
          别自己在 Issue 海里瞎翻。告诉我你想怎么赚钱、你会什么，我帮你缩小到几个靠谱项目，
          把结算讲清楚，再带你去接任务。
        </p>
      </header>

      <MatchWorkspace projects={snapshot.projects} generatedAt={snapshot.generated_at} />

      <p className="footer">
        简介与结算说明为人工整理，接单前请再核对官方页面。你的技能/目标/短名单会保存在本机浏览器。
      </p>
    </main>
  );
}
