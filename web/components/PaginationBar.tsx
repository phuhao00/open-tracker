"use client";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
};

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
  disabled,
  label = "条目",
}: Props) {
  if (total <= 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  return (
    <nav className="pager" aria-label="分页">
      <p className="pager-meta">
        {start}–{end} / {total} {label}
      </p>
      <div className="pager-controls">
        <button
          type="button"
          className="pager-btn"
          disabled={!canPrev}
          onClick={() => onChange(page - 1)}
          aria-label="上一页"
        >
          ‹ 上一页
        </button>
        <span className="pager-indicator" aria-current="page">
          第 {page} 页<span className="pager-of"> · 共 {totalPages} 页</span>
        </span>
        <button
          type="button"
          className="pager-btn"
          disabled={!canNext}
          onClick={() => onChange(page + 1)}
          aria-label="下一页"
        >
          下一页 ›
        </button>
      </div>
    </nav>
  );
}
