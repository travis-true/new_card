export const SITE_NAME = "CardScout";
export const OWNER_EMAIL = "true.travis@gmail.com";

export const CONTACT_HREF = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(`${SITE_NAME} contact`)}`;

export const FEATURE_REQUEST_HREF = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(
  `${SITE_NAME} feature request`,
)}&body=${encodeURIComponent("What would you like to see?\n\n\nWhy would it help you?\n\n")}`;

export const DISCLAIMER =
  "CardScout does not sell cards, process payments or ship anything. Any buying, selling or trading between users happens off the site and is entirely at your own risk. Verify the other person and the card before you pay or send anything.";
