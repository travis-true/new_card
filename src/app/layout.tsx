import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { CONTACT_HREF, DISCLAIMER, FEATURE_REQUEST_HREF, SITE_NAME } from "@/lib/site";
import { LogoutButton } from "@/components/LogoutButton";
import { SwRegister } from "@/components/SwRegister";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME}: sports card scanner`, template: `%s | ${SITE_NAME}` },
  description: "Scan the front and back of a sports card, identify it, and build your collection.",
  applicationName: SITE_NAME,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0b2540", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="bar">
            <Link href="/" className="logo">Card<span>Scout</span></Link>
            <nav className="nav" aria-label="Main">
              {user ? (
                <>
                  <Link href="/scan">Scan</Link>
                  <Link href="/collections">Collections</Link>
                  <Link href="/market">Market</Link>
                  <Link href={`/u/${user.username}`}>{user.username}</Link>
                  <Link href="/settings">Settings</Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/market">Market</Link>
                  <Link href="/login">Log in</Link>
                  <Link href="/signup">Sign up</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="inner">
            <p style={{ margin: 0 }}>{DISCLAIMER}</p>
            <div className="links">
              <a href={CONTACT_HREF}>Contact</a>
              <a href={FEATURE_REQUEST_HREF}>Feature Requests</a>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </footer>
        <SwRegister />
      </body>
    </html>
  );
}
