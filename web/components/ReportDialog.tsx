"use client";

import { useEffect, useState } from "react";

const REASONS = [
  { id: "spam", label: "垃圾广告" },
  { id: "illegal", label: "违法违规" },
  { id: "misleading", label: "虚假误导" },
  { id: "scam", label: "疑似诈骗" },
  { id: "other", label: "其他" },
] as const;

type ReasonId = (typeof REASONS)[number]["id"];

export function ReportDialog({
  taskId,
  open,
  onClose,
  onDone,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState<ReasonId>("spam");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("spam");
    setDetail("");
    setError("");
    setBusy(false);
  }, [open, taskId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !taskId) return null;

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/opportunities/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        reason,
        detail: detail.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "举报失败");
      return;
    }
    onDone(data.message || "已收到举报");
    onClose();
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <div className="coach-label">举报机会</div>
            <h3 id="report-dialog-title">告诉我们哪里不对</h3>
          </div>
          <button type="button" className="icon-close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="hint">审核人员会处理，恶意举报可能影响信誉。</p>
        <div className="report-reasons">
          {REASONS.map((r) => (
            <label key={r.id} className={`report-reason ${reason === r.id ? "active" : ""}`}>
              <input
                type="radio"
                name="report-reason"
                value={r.id}
                checked={reason === r.id}
                onChange={() => setReason(r.id)}
              />
              {r.label}
            </label>
          ))}
        </div>
        <label className="field">
          <span>补充说明（可选）</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="例如：报酬与描述不符、联系方式无效…"
          />
        </label>
        {error && (
          <p className="toast-inline toast-err" role="alert">
            {error}
          </p>
        )}
        <div className="detail-cta-stack" style={{ marginTop: "0.75rem" }}>
          <button type="button" className="btn gold" disabled={busy} onClick={submit}>
            {busy ? "提交中…" : "提交举报"}
          </button>
          <button type="button" className="btn ghost" disabled={busy} onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
