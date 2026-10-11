import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CardScout",
    short_name: "CardScout",
    description: "Scan sports cards, identify them and build your collection.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b2540",
    theme_color: "#0b2540",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
