import { MatchWorkspace } from "@/components/MatchWorkspace";
import { loadSnapshot } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MatchPage() {
  let projects: Awaited<ReturnType<typeof loadSnapshot>>["projects"] = [];
  let generatedAt = new Date().toISOString();
  try {
    const snapshot = await loadSnapshot();
    projects = snapshot.projects;
    generatedAt = snapshot.generated_at;
  } catch {
    // 没有本地 JSON 时仍展示空态
  }

  return (
    <main>
      <header className="hero">
        <h1 className="brand">
          智能<span>匹配</span>
        </h1>
        <p className="lede">
          基于项目画像与结算说明，帮你判断「适不适合我、钱怎么结、怎么上手」。
          可与悬赏大厅的多源任务互补使用。
        </p>
      </header>
      {projects.length > 0 ? (
        <MatchWorkspace projects={projects} generatedAt={generatedAt} />
      ) : (
        <div className="panel human-empty">
          <strong>还没有本地追踪快照</strong>
          <p>
            在仓库根目录运行 <code>opentacker run --all</code>，或先去悬赏大厅同步多源任务。
          </p>
        </div>
      )}
    </main>
  );
}
