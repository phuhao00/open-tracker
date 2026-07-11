import { prisma } from "../prisma";
import { algoraSource } from "./algora";
import { githubSearchSource } from "./github-search";
import { paidListSource } from "./paid-list";
import type { SourceFetcher } from "./types";

export const ALL_FETCHERS: SourceFetcher[] = [
  paidListSource,
  githubSearchSource,
  algoraSource,
];

export async function ensureDefaultSources() {
  for (const f of ALL_FETCHERS) {
    await prisma.bountySource.upsert({
      where: { key: f.key },
      create: {
        key: f.key,
        name: f.name,
        description: f.description,
        enabled: true,
      },
      update: {
        name: f.name,
        description: f.description,
      },
    });
  }
}

export async function syncSource(key: string) {
  const fetcher = ALL_FETCHERS.find((f) => f.key === key);
  if (!fetcher) throw new Error(`未知数据源: ${key}`);

  await ensureDefaultSources();
  const source = await prisma.bountySource.findUnique({ where: { key } });
  if (!source) throw new Error(`数据源未初始化: ${key}`);

  try {
    const items = await fetcher.fetch();
    let upserted = 0;
    for (const item of items) {
      await prisma.bountyTask.upsert({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: item.externalId,
          },
        },
        create: {
          sourceId: source.id,
          externalId: item.externalId,
          title: item.title,
          url: item.url,
          projectName: item.projectName,
          repo: item.repo ?? null,
          amountText: item.amountText ?? null,
          amountMin: item.amountMin ?? null,
          amountMax: item.amountMax ?? null,
          currency: item.currency ?? "USD",
          techTags: JSON.stringify(item.techTags ?? []),
          kind: item.kind,
          status: item.status,
          summary: item.summary ?? null,
          rawJson: JSON.stringify(item.raw ?? {}),
          fetchedAt: new Date(),
        },
        update: {
          title: item.title,
          url: item.url,
          projectName: item.projectName,
          repo: item.repo ?? null,
          amountText: item.amountText ?? null,
          amountMin: item.amountMin ?? null,
          amountMax: item.amountMax ?? null,
          currency: item.currency ?? "USD",
          techTags: JSON.stringify(item.techTags ?? []),
          kind: item.kind,
          status: item.status,
          summary: item.summary ?? null,
          rawJson: JSON.stringify(item.raw ?? {}),
          fetchedAt: new Date(),
        },
      });
      upserted += 1;
    }

    await prisma.bountySource.update({
      where: { id: source.id },
      data: { lastSyncAt: new Date(), lastError: null },
    });

    return { key, count: upserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.bountySource.update({
      where: { id: source.id },
      data: { lastError: message },
    });
    throw err;
  }
}

export async function syncAllEnabledSources() {
  await ensureDefaultSources();
  const sources = await prisma.bountySource.findMany({ where: { enabled: true } });
  const results: Array<{ key: string; count?: number; error?: string }> = [];
  for (const s of sources) {
    try {
      const r = await syncSource(s.key);
      results.push(r);
    } catch (err) {
      results.push({
        key: s.key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
