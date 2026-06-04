import { ContractDetailClient } from "@/components/ContractDetailClient";
import type { TemplateSlug } from "@/lib/templates";

const validTemplates = new Set([
  "tipjar",
  "guestbook",
  "builder-badge",
  "simple-erc20",
  "mini-escrow",
  "usdc-tipjar",
  "usdc-mini-escrow"
]);

export default function ContractPage({
  params,
  searchParams
}: {
  params: { address: string };
  searchParams: { template?: string };
}) {
  const template = validTemplates.has(searchParams.template ?? "")
    ? (searchParams.template as TemplateSlug)
    : "tipjar";

  return <ContractDetailClient contractAddress={params.address} template={template} />;
}
