// app/founder/layout.tsx
import { FounderSidebar } from './dashboard/_components/sidebar';

export default function FounderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <FounderSidebar />
      <main className="flex-1 p-8 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
