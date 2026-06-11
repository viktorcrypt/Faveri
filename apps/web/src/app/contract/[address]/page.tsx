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

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <ContractDetailClient contractAddress={params.address} template={template} />
    </main>
  );
}
