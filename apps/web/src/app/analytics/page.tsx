import { DashboardClient } from "@/components/DashboardClient";

export default function AnalyticsPage() {
  return (
    <main className="route-page relative min-h-[100dvh] px-4 pb-14 pt-24 sm:px-6 lg:px-10">
      <div className="route-grid" aria-hidden="true" />
      <div className="mx-auto max-w-[1500px]">
        <DashboardClient />
      </div>
    </main>
  );
}
