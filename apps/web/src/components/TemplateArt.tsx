import Image from "next/image";
import type { TemplateSlug } from "@/lib/templates";

export const templateVisuals: Record<
  TemplateSlug,
  {
    artClass: string;
    proof: string;
    surface: string;
    signal: string;
  }
> = {
  tipjar: {
    artClass: "art-tipjar",
    proof: "ETH tips",
    surface: "Creator cashflow",
    signal: "Withdrawable by owner"
  },
  guestbook: {
    artClass: "art-guestbook",
    proof: "Public notes",
    surface: "Message wall",
    signal: "Fee-gated posts"
  },
  "builder-badge": {
    artClass: "art-builder-badge",
    proof: "ERC721",
    surface: "Contributor identity",
    signal: "Transfer rule encoded"
  },
  "simple-erc20": {
    artClass: "art-simple-erc20",
    proof: "ERC20",
    surface: "Builder token",
    signal: "Fixed or mintable"
  },
  "mini-escrow": {
    artClass: "art-mini-escrow",
    proof: "Locked reward",
    surface: "Quest settlement",
    signal: "Approve then claim"
  },
  "usdc-tipjar": {
    artClass: "art-usdc-tipjar",
    proof: "USDC payments",
    surface: "Arc cashflow",
    signal: "ERC20 approve then tip"
  },
  "usdc-mini-escrow": {
    artClass: "art-usdc-mini-escrow",
    proof: "USDC settlement",
    surface: "Milestone escrow",
    signal: "Stable reward locked"
  }
};

const templateArtwork: Record<
  TemplateSlug,
  {
    src: string;
    position: string;
  }
> = {
  tipjar: {
    src: "/templates/Tip%20Jar.png",
    position: "52% 50%"
  },
  guestbook: {
    src: "/templates/Guestbook.png",
    position: "50% 50%"
  },
  "builder-badge": {
    src: "/templates/Builder%20Badge.png",
    position: "52% 50%"
  },
  "simple-erc20": {
    src: "/templates/Simple%20ERC20.png",
    position: "50% 50%"
  },
  "mini-escrow": {
    src: "/templates/Mini%20Escrow.png",
    position: "50% 50%"
  },
  "usdc-tipjar": {
    src: "/templates/USDC%20Tip%20Jar.png",
    position: "50% 50%"
  },
  "usdc-mini-escrow": {
    src: "/templates/USDC%20Mini%20Escrow.png",
    position: "50% 50%"
  }
};

export function TemplateArt({ slug, large = false }: { slug: TemplateSlug; large?: boolean }) {
  const artwork = templateArtwork[slug];
  const imageSizes = large
    ? "(min-width: 1536px) 760px, (min-width: 1280px) 52vw, 100vw"
    : "(min-width: 1536px) 520px, (min-width: 1024px) 48vw, (min-width: 768px) 50vw, 92vw";

  return (
    <span className="absolute inset-0 block overflow-hidden">
      <Image
        alt=""
        aria-hidden="true"
        className={`object-cover transition duration-700 ease-out ${large ? "scale-[1.015]" : "group-hover:scale-[1.045]"}`}
        fill
        priority={large}
        quality={100}
        sizes={imageSizes}
        src={artwork.src}
        style={{ objectPosition: artwork.position }}
        unoptimized
      />
      <span className="template-art-vignette" aria-hidden="true" />
    </span>
  );
}

