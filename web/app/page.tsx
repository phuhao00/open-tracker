import { BountyHall } from "@/components/BountyHall";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <header className="hero hero-compact">
        <p className="hero-kicker">Global opportunity hall</p>
        <h1 className="brand">
          Open<span>Tacker</span>
        </h1>
        <p className="lede">
          发现全球灵活就业机会：岗位、门户入口与开源悬赏，按技能匹配后立即行动。
        </p>
        <div className="hero-cta">
          <Link href="/register" className="btn gold">
            免费注册
          </Link>
          <Link href="/login" className="btn ghost">
            登录
          </Link>
        </div>
      </header>

      <BountyHall />

      <p className="footer">
        门户入口仅跳转源站；岗位与悬赏可认领协作。完善技能后排序更准。
      </p>
    </main>
  );
}
