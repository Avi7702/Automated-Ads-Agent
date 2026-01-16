import { QuotaDashboard } from "@/components/quota";
import { Header } from "@/components/layout/Header";

interface QuotaDashboardPageProps {
  embedded?: boolean;
}

export default function QuotaDashboardPage({ embedded = false }: QuotaDashboardPageProps) {
  // Embedded mode - just render content
  if (embedded) {
    return <QuotaDashboard />;
  }

  // Standalone mode - full page layout
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl mx-auto px-6 py-8">
        <QuotaDashboard />
      </main>
    </div>
  );
}
