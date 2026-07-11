import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <main>
      <header className="hero">
        <h1 className="brand">
          我的<span>工作台</span>
        </h1>
        <p className="lede">管理技能、目标、数据源开关与短名单，让大厅更贴合你。</p>
      </header>
      <DashboardClient />
    </main>
  );
}
