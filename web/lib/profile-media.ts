export type SocialLink = {
  platform: string;
  url: string;
  label?: string;
};

export type VideoLink = {
  title?: string;
  url: string;
};

export const SOCIAL_PLATFORMS: Array<{ id: string; label: string; placeholder: string }> = [
  { id: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/..." },
  { id: "x", label: "X / Twitter", placeholder: "https://x.com/username" },
  { id: "website", label: "个人网站", placeholder: "https://..." },
  { id: "bilibili", label: "Bilibili", placeholder: "https://space.bilibili.com/..." },
  { id: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@..." },
  { id: "zhihu", label: "知乎", placeholder: "https://www.zhihu.com/people/..." },
  { id: "juejin", label: "掘金", placeholder: "https://juejin.cn/user/..." },
  { id: "xiaohongshu", label: "小红书", placeholder: "https://www.xiaohongshu.com/..." },
  { id: "douyin", label: "抖音", placeholder: "https://www.douyin.com/..." },
  { id: "wechat", label: "微信公众号 / 主页", placeholder: "链接或说明" },
  { id: "email", label: "公开邮箱", placeholder: "hello@example.com" },
  { id: "other", label: "其他", placeholder: "https://..." },
];

export function parseJsonList<T>(raw: string | null | undefined): T[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function platformLabel(id: string) {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label || id;
}

/** 将常见视频链接转为可嵌入播放的 URL；无法识别则返回 null */
export function toEmbedUrl(rawUrl: string): { embedUrl: string; platform: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v) return { embedUrl: `https://www.youtube.com/embed/${v}`, platform: "youtube" };
    const m = path.match(/\/embed\/([\w-]+)/) || path.match(/\/shorts\/([\w-]+)/);
    if (m) return { embedUrl: `https://www.youtube.com/embed/${m[1]}`, platform: "youtube" };
  }
  if (host === "youtu.be") {
    const id = path.replace(/^\//, "").split("/")[0];
    if (id) return { embedUrl: `https://www.youtube.com/embed/${id}`, platform: "youtube" };
  }

  // Bilibili
  if (host.endsWith("bilibili.com")) {
    const bv = path.match(/\/video\/(BV[\w]+)/i);
    if (bv) {
      return {
        embedUrl: `https://player.bilibili.com/player.html?bvid=${bv[1]}&high_quality=1&autoplay=0`,
        platform: "bilibili",
      };
    }
    const av = path.match(/\/video\/av(\d+)/i);
    if (av) {
      return {
        embedUrl: `https://player.bilibili.com/player.html?aid=${av[1]}&high_quality=1&autoplay=0`,
        platform: "bilibili",
      };
    }
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = path.match(/\/(?:video\/)?(\d+)/);
    if (m) return { embedUrl: `https://player.vimeo.com/video/${m[1]}`, platform: "vimeo" };
  }

  // Loom
  if (host === "loom.com" || host === "www.loom.com") {
    const m = path.match(/\/(?:share|embed)\/([\w-]+)/);
    if (m) return { embedUrl: `https://www.loom.com/embed/${m[1]}`, platform: "loom" };
  }

  // Coub / others — no embed
  return null;
}

export function normalizeHttpUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.includes("@") && !raw.includes("://") && !raw.startsWith("http")) {
    // email style — keep as mailto for email platform only, else as text url
    return raw;
  }
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
