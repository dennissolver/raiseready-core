import { PortalSidebar } from './_components/sidebar'

export default function PortalDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <PortalSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
