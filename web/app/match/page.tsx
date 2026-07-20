import Link from "next/link";
import { MatchWorkspace } from "@/components/MatchWorkspace";
import { auth } from "@/lib/auth";
import { listBounties } from "@/lib/bounties-list";

export const dynamic = "force-dynamic";

export default async function MatchPage() {
  const session = await auth();
  const result = await listBounties({
    page: 1,
    pageSize: 40,
    sort: "match",
    userId: session?.user?.id ?? null,
  });

  return (
    <main>
      <header className="hero">
        <h1 className="brand">
          智能<span>匹配</span>
        </h1>
        <p className="lede">
          与机会大厅共用同一批任务，按你的技能与目标排序，并给出结算与上手建议。
        </p>
      </header>
      {result.items.length > 0 ? (
        <MatchWorkspace initialItems={result.items} fetchedAt={new Date().toISOString()} />
      ) : (
        <div className="panel human-empty">
          <strong>还没有可匹配的机会</strong>
          <p>去机会大厅同步外部源，或先发布一条协作机会。</p>
          <div className="detail-cta-stack" style={{ justifyContent: "flex-start" }}>
            <Link href="/" className="btn primary">
              去机会大厅
            </Link>
            <Link href="/publish" className="btn ghost">
              发布机会
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
