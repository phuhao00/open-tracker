import { CommunityBoard } from "@/components/CommunityBoard";

export default function CommunityPage() {
  return (
    <main>
      <header className="hero">
        <h1 className="brand">
          协作<span>社区</span>
        </h1>
        <p className="lede">
          灵活就业不是单打独斗。看谁在做哪单、互相认识、减少撞车，把开源悬赏做成可持续的收入网络。
        </p>
      </header>
      <CommunityBoard />
    </main>
  );
}
