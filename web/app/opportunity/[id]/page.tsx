import { notFound } from "next/navigation";
import Link from "next/link";
import { OpportunityDetail } from "@/components/OpportunityDetail";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isModerator } from "@/lib/opportunity-policy";
import { classifyTaxonomy, taxonomyLabel } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function OpportunityPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const task = await prisma.bountyTask.findUnique({
    where: { id },
    include: {
      source: { select: { key: true, name: true } },
      publisher: {
        select: { id: true, name: true, headline: true, reputation: true },
      },
      claims: {
        where: { status: { in: ["working", "submitted"] } },
        select: {
          id: true,
          status: true,
          user: { select: { id: true, name: true } },
        },
        take: 12,
      },
    },
  });

  if (!task) notFound();

  const viewerId = session?.user?.id;
  let viewerIsMod = false;
  if (viewerId) {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true, email: true },
    });
    viewerIsMod = Boolean(viewer && isModerator(viewer));
  }

  const isPublisher = Boolean(viewerId && task.publisherId === viewerId);
  const visible =
    task.moderationStatus === "approved" || isPublisher || viewerIsMod;

  if (!visible) {
    return (
      <main>
        <div className="panel human-empty">
          <strong>该机会暂不可见</strong>
          <p>可能仍在审核，或已被下架。</p>
          <Link href="/" className="btn primary">
            回机会大厅
          </Link>
        </div>
      </main>
    );
  }

  let techTags: string[] = [];
  try {
    const parsed = JSON.parse(task.techTags || "[]");
    techTags = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    techTags = [];
  }

  const tax = classifyTaxonomy({
    kind: task.kind,
    sourceKey: task.source.key,
    title: task.title,
    summary: task.summary,
    techTags,
    rawJson: task.rawJson,
  });

  return (
    <main>
      <header className="hero hero-compact">
        <p className="hero-kicker">Opportunity detail</p>
        <h1 className="brand" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
          机会<span>详情</span>
        </h1>
      </header>
      <OpportunityDetail
        data={{
          id: task.id,
          title: task.title,
          url: task.url,
          projectName: task.projectName,
          repo: task.repo,
          amountText: task.amountText,
          amountMax: task.amountMax,
          currency: task.currency,
          techTags,
          kind: task.kind,
          summary: task.summary,
          engagementType: task.engagementType,
          contactMode: task.contactMode,
          contactValue: task.contactValue,
          locationText: task.locationText,
          moderationStatus: task.moderationStatus,
          expiresAt: task.expiresAt?.toISOString() ?? null,
          source: task.source,
          publisher: task.publisher,
          activeClaims: task.claims,
          taxonomyLabel: taxonomyLabel(tax),
        }}
      />
    </main>
  );
}
