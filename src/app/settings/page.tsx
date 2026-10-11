import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Settings</h1>
      <p className="muted">Signed in as {user.email}. Your email is never shown to other users.</p>
      <ProfileForm bio={user.bio} contactLink={user.contactLink} />
    </div>
  );
}
