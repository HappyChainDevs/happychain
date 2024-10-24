export function getDomainUrl(request: Request) {
  const host =
    request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");
  if (!host) {
    throw new Error("Could not determine domain URL.");
  }
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export const generateUrl = (origin = "https://v2.magicswap.lol", path = "/") =>
  origin + path;

export function generateTitle(title?: string) {
  return title ? `${title} | Magicswap` : "Magicswap";
}

export function getSocialMetas({
  url,
  title = "Magicswap",
  description = "The gateway to the cross-game economy. Swap, pool, and earn tokens in the decentralized exchanged powered by Treasure and MAGIC.",
  keywords = "treasure, NFT, DeFi, games, community, imagination, magic",
  image,
}: {
  image?: string;
  url: string;
  title?: string;
  description?: string;
  keywords?: string;
}) {
  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { name: "image", content: image },
    {
      name: "twitter:card",
      content: image ? "summary_large_image" : "summary",
    },
    { name: "twitter:creator", content: "@Treasure_DAO" },
    { name: "twitter:site", content: "@Treasure_DAO" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:alt", content: title },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
  ];
}
