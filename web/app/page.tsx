import { BountyHall } from "@/components/BountyHall";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <header className="hero">
        <h1 className="brand">
          Open<span>Tacker</span>
        </h1>
        <p className="lede">
          凝聚灵活就业者的力量：自动发现开源悬赏，按技能匹配，认领防撞车，公开履历与收益账本，
          让每个人都能更稳地靠贡献赚钱。
        </p>
        <div className="flow-steps">
          <span>发现悬赏</span>
          <span className="arrow">→</span>
          <span>匹配技能</span>
          <span className="arrow">→</span>
          <span>认领协作</span>
          <span className="arrow">→</span>
          <span>交付收款</span>
        </div>
        <div className="hero-cta">
          <Link href="/register" className="btn gold">
            加入协作网络
          </Link>
          <Link href="/community" className="btn primary">
            看看伙伴在做什么
          </Link>
        </div>
      </header>

      <section className="value-grid">
        <div className="panel value-card">
          <h3>多源发现</h3>
          <p>付费列表、GitHub、Algora 自动聚合，少刷网页多接单。</p>
        </div>
        <div className="panel value-card">
          <h3>认领防撞车</h3>
          <p>声明「我在做这单」，社区可见，减少重复劳动。</p>
        </div>
        <div className="panel value-card">
          <h3>履历与收益</h3>
          <p>公开主页 + 自报账本，积累灵活就业信誉资产。</p>
        </div>
      </section>

      <BountyHall />
      <p className="footer">
        最佳实践：先完善技能与档案 → 同步悬赏 → 认领一单并更新状态 → 收款后记入账本。
      </p>
    </main>
  );
}
