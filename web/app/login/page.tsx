import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Suspense fallback={<div className="auth-loading">加载中…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
