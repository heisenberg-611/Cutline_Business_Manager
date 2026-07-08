import { AppLayout } from '@/modules/core/ui/AppLayout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}
