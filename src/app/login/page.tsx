import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/scan");
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Log in</h1>
      <AuthForm mode="login" />
      <p className="muted">New here? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}
