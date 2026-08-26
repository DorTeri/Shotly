import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");

  if (!adminConfigured()) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-ink px-6" dir="ltr">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-[22px] font-extrabold">Console disabled</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-paper-2">
            Set <code className="tabular text-gold">ADMIN_PASSWORD</code> in{" "}
            <code className="tabular">.env</code> and restart the server.
          </p>
        </div>
      </main>
    );
  }

  return <LoginForm />;
}
