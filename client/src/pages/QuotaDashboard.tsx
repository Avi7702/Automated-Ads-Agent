import { QuotaDashboard } from "@/components/quota";
import { Header } from "@/components/layout/Header";

export default function QuotaDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl mx-auto px-6 py-8">
        <QuotaDashboard />
      </main>
    </div>
  );
}
