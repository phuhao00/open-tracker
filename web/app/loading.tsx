export default function Loading() {
  return (
    <main className="route-loading" aria-busy="true" aria-live="polite">
      <div className="route-loading-bar" />
      <p className="muted">加载中…</p>
    </main>
  );
}
