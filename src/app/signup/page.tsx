import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/scan");
  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Create your account</h1>
      <AuthForm mode="signup" />
      <p className="muted small">
        By signing up you agree to the <Link href="/terms">terms</Link>, including that trades and sales between users are at your own risk.
      </p>
      <p className="muted">Already have an account? <Link href="/login">Log in</Link></p>
    </div>
  );
}
