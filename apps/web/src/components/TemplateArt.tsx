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

export function TemplateArt({ slug, large = false }: { slug: TemplateSlug; large?: boolean }) {
  if (slug === "tipjar") {
    return (
      <span className="absolute inset-0">
        <span className={`${large ? "left-[18%] top-[20%] h-24 w-24" : "left-[14%] top-[18%] h-16 w-16"} absolute rounded-full border border-ink-300/30 bg-ink-300/[0.15]`} />
        <span className={`${large ? "right-[16%] top-[24%] h-32 w-20" : "right-[18%] top-[22%] h-24 w-16"} absolute rounded-[28px] border border-[#e8c985]/25 bg-[#e8c985]/[0.12]`} />
        <span className={`${large ? "bottom-[18%] left-[26%] h-12 w-44" : "bottom-[18%] left-[18%] h-9 w-32"} absolute rounded-full border border-white/[0.15] bg-white/[0.06]`} />
      </span>
    );
  }

  if (slug === "guestbook") {
    return (
      <span className="absolute inset-0">
        <span className={`${large ? "left-[17%] top-[18%] h-32 w-48" : "left-[12%] top-[20%] h-24 w-36"} absolute rotate-[-5deg] rounded-[18px] border border-white/[0.15] bg-white/[0.07]`} />
        <span className={`${large ? "right-[14%] top-[32%] h-28 w-44" : "right-[10%] top-[34%] h-20 w-32"} absolute rotate-[6deg] rounded-[18px] border border-ink-300/25 bg-ink-300/[0.12]`} />
        <span className="absolute bottom-[20%] left-[22%] h-px w-[54%] bg-white/20" />
      </span>
    );
  }

  if (slug === "builder-badge") {
    return (
      <span className="absolute inset-0">
        <span className={`${large ? "left-[24%] top-[18%] h-36 w-36" : "left-[24%] top-[20%] h-24 w-24"} absolute rotate-45 rounded-[28px] border border-[#e8c985]/30 bg-[#e8c985]/[0.12]`} />
        <span className={`${large ? "right-[22%] bottom-[18%] h-20 w-20" : "right-[20%] bottom-[20%] h-14 w-14"} absolute rounded-full border border-ink-300/30 bg-ink-300/[0.14]`} />
        <span className="absolute left-[42%] top-[34%] h-14 w-14 rounded-full border border-white/20 bg-[#081011]/[0.45]" />
      </span>
    );
  }

  if (slug === "simple-erc20") {
    return (
      <span className="absolute inset-0">
        <span className={`${large ? "left-[16%] top-[20%] h-36 w-36" : "left-[16%] top-[23%] h-24 w-24"} absolute rounded-full border border-ink-300/[0.35] bg-ink-300/[0.12]`} />
        <span className={`${large ? "right-[14%] top-[24%] h-36 w-36" : "right-[12%] top-[26%] h-24 w-24"} absolute rounded-full border border-white/[0.15] bg-white/[0.055]`} />
        <span className={`${large ? "bottom-[20%] left-[30%] h-10 w-44" : "bottom-[20%] left-[26%] h-8 w-32"} absolute rounded-full border border-[#e8c985]/20 bg-[#e8c985]/10`} />
      </span>
    );
  }

  if (slug === "usdc-tipjar") {
    return (
      <span className="absolute inset-0">
        <span className={`${large ? "left-[14%] top-[18%] h-32 w-32" : "left-[12%] top-[20%] h-24 w-24"} absolute rounded-full border border-white/25 bg-white/[0.08]`} />
        <span className={`${large ? "right-[16%] top-[28%] h-28 w-48" : "right-[10%] top-[32%] h-20 w-36"} absolute rounded-[999px] border border-[#98e2ff]/25 bg-[#98e2ff]/[0.12]`} />
        <span className={`${large ? "bottom-[17%] left-[22%] h-12 w-52" : "bottom-[18%] left-[18%] h-9 w-36"} absolute rounded-full border border-[#d7f7e5]/20 bg-[#d7f7e5]/[0.08]`} />
        <span className="absolute left-[45%] top-[38%] font-mono text-2xl font-semibold text-white/70">$</span>
      </span>
    );
  }

  if (slug === "usdc-mini-escrow") {
    return (
      <span className="absolute inset-0">
        <span className={`${large ? "left-[16%] top-[21%] h-28 w-52" : "left-[10%] top-[23%] h-20 w-36"} absolute rounded-[20px] border border-[#98e2ff]/25 bg-[#98e2ff]/10`} />
        <span className={`${large ? "right-[16%] bottom-[17%] h-28 w-52" : "right-[10%] bottom-[20%] h-20 w-36"} absolute rounded-[20px] border border-white/20 bg-white/[0.07]`} />
        <span className="absolute left-[44%] top-[40%] h-14 w-14 rounded-full border border-[#d7f7e5]/25 bg-[#061113]/60" />
        <span className="absolute left-[calc(44%+18px)] top-[calc(40%+14px)] h-7 w-5 rounded-b-full border-x border-b border-white/40" />
      </span>
    );
  }

  return (
    <span className="absolute inset-0">
      <span className={`${large ? "left-[18%] top-[20%] h-28 w-52" : "left-[12%] top-[22%] h-20 w-36"} absolute rounded-[18px] border border-[#e8c985]/25 bg-[#e8c985]/10`} />
      <span className={`${large ? "right-[18%] bottom-[18%] h-28 w-52" : "right-[12%] bottom-[20%] h-20 w-36"} absolute rounded-[18px] border border-ink-300/25 bg-ink-300/10`} />
      <span className="absolute left-[45%] top-[42%] h-12 w-12 rounded-full border border-white/20 bg-[#081011]/50" />
    </span>
  );
}

