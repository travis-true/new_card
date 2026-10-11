import { CONTACT_HREF, DISCLAIMER, FEATURE_REQUEST_HREF } from "@/lib/site";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <h1>Terms and disclaimer</h1>
      <div className="notice">{DISCLAIMER}</div>
      <h2>No marketplace</h2>
      <p>
        CardScout is a tool for identifying cards and organizing collections. We do not take part in any sale or trade, hold funds or
        cards, authenticate or grade cards, or guarantee that a listing or a user is genuine.
      </p>
      <h2>Your risk</h2>
      <p>
        If you choose to buy, sell or trade with another user, you do so entirely at your own risk. We are not responsible for lost,
        damaged, counterfeit or misdescribed cards, non-payment, or any dispute between users. Use payment and shipping methods that
        protect you.
      </p>
      <h2>Identification is a best guess</h2>
      <p>
        Card identification is generated automatically from your photos and can be wrong, especially for parallels and variants.
        Review the details before you rely on them.
      </p>
      <h2>Your content</h2>
      <p>
        Cards and photos in a public collection, your username, bio and contact link are visible to anyone. Keep a collection private
        if you do not want it shared. Do not post anything unlawful or anyone else&apos;s personal information.
      </p>
      <h2>Questions and ideas</h2>
      <p>
        <a href={CONTACT_HREF}>Contact us</a> or <a href={FEATURE_REQUEST_HREF}>send a feature request</a> by email.
      </p>
    </div>
  );
}
