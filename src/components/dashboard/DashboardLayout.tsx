import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import type { UserRole } from '@/types/database'

interface DashboardLayoutProps {
  children:   React.ReactNode
  role:       UserRole
  name:       string | null
  email:      string | null
  avatarUrl?: string | null
  pageTitle?: string
}

export function DashboardLayout({ children, role, name, email, avatarUrl, pageTitle }: DashboardLayoutProps) {
  const isClient = role === 'user'

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-60 flex-shrink-0 flex-col">
        <Sidebar role={role} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header name={name} email={email} role={role} avatarUrl={avatarUrl} pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div
            className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8"
            style={isClient ? { paddingBottom: 'calc(4rem + env(safe-area-inset-bottom) + 1.5rem)' } : undefined}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — clients on mobile only */}
      {isClient && <BottomNav />}
    </div>
  )
}
