export type NormalizedBounty = {
  externalId: string;
  title: string;
  url: string;
  projectName: string;
  repo?: string | null;
  amountText?: string | null;
  amountMin?: number | null; // cents
  amountMax?: number | null;
  currency?: string;
  techTags: string[];
  kind: string;
  status: string;
  summary?: string | null;
  raw?: unknown;
};

export type SourceFetcher = {
  key: string;
  name: string;
  description: string;
  fetch: () => Promise<NormalizedBounty[]>;
};

function parseUsdToCents(text: string): { min?: number; max?: number } {
  const nums = [...text.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)].map((m) =>
    Math.round(parseFloat(m[1].replace(/,/g, "")) * 100),
  );
  if (!nums.length) return {};
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

export function amountFromText(text?: string | null) {
  if (!text) return { amountText: null, amountMin: null, amountMax: null };
  const { min, max } = parseUsdToCents(text);
  return { amountText: text, amountMin: min ?? null, amountMax: max ?? null };
}
