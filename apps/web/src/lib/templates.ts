import { Award, BadgeDollarSign, BookOpenText, Coins, HandCoins, Handshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LauncherMode = "ink" | "arc";
export type TemplateSlug =
  | "tipjar"
  | "guestbook"
  | "builder-badge"
  | "simple-erc20"
  | "mini-escrow"
  | "usdc-tipjar"
  | "usdc-mini-escrow";

export type TemplateInfo = {
  id: number;
  slug: TemplateSlug;
  mode: LauncherMode;
  currency: "ETH" | "USDC";
  title: string;
  contractName: string;
  description: string;
  notice: string;
  icon: LucideIcon;
};

export const templates: TemplateInfo[] = [
  {
    id: 0,
    slug: "tipjar",
    mode: "ink",
    currency: "ETH",
    title: "Tip Jar",
    contractName: "TipJar",
    description: "Collect ETH tips for a builder project and withdraw as owner.",
    notice: "TipJar funds are controlled only by the contract owner.",
    icon: BadgeDollarSign
  },
  {
    id: 1,
    slug: "guestbook",
    mode: "ink",
    currency: "ETH",
    title: "Guestbook",
    contractName: "Guestbook",
    description: "Publish a public onchain message wall with optional message fees.",
    notice: "Guestbook messages are public blockchain data.",
    icon: BookOpenText
  },
  {
    id: 2,
    slug: "builder-badge",
    mode: "ink",
    currency: "ETH",
    title: "Builder Badge",
    contractName: "BuilderBadge",
    description: "Mint ERC721 badges for contributors, testers, quest winners, or beta users.",
    notice: "Non-transferable badges block transfers after mint.",
    icon: Award
  },
  {
    id: 3,
    slug: "simple-erc20",
    mode: "ink",
    currency: "ETH",
    title: "Simple ERC20",
    contractName: "SimpleERC20",
    description: "Launch a fixed-supply or owner-mintable ERC20 experiment.",
    notice: "Mintable tokens can be expanded by the owner; fixed supply tokens cannot.",
    icon: Coins
  },
  {
    id: 4,
    slug: "mini-escrow",
    mode: "ink",
    currency: "ETH",
    title: "Mini Escrow",
    contractName: "MiniEscrow",
    description: "Lock a quest or milestone reward until proof is submitted and approved.",
    notice: "Escrow funds are locked by contract rules and claimable only after approval.",
    icon: Handshake
  },
  {
    id: 5,
    slug: "usdc-tipjar",
    mode: "arc",
    currency: "USDC",
    title: "USDC Tip Jar",
    contractName: "USDCTipJar",
    description: "Collect USDC payments on Arc with owner-controlled settlement.",
    notice: "Tips use ERC20 USDC approval and are withdrawable only by the owner.",
    icon: HandCoins
  },
  {
    id: 6,
    slug: "usdc-mini-escrow",
    mode: "arc",
    currency: "USDC",
    title: "USDC Mini Escrow",
    contractName: "USDCMiniEscrow",
    description: "Lock a USDC milestone reward on Arc until proof is approved.",
    notice: "USDC is transferred from the creator into the escrow contract during deployment.",
    icon: Handshake
  }
];

export const templateBySlug = templates.reduce(
  (acc, template) => {
    acc[template.slug] = template;
    return acc;
  },
  {} as Record<TemplateSlug, TemplateInfo>
);

export function templateById(templateId: number) {
  return templates.find((template) => template.id === templateId);
}

export function templateSlugFromId(templateId: number) {
  return templateById(templateId)?.slug ?? "tipjar";
}

export function templatesForMode(mode: LauncherMode) {
  return templates.filter((template) => template.mode === mode);
}

export function isUSDCTemplate(slug: TemplateSlug) {
  return slug === "usdc-tipjar" || slug === "usdc-mini-escrow";
}
