'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  TrendingUp,
  UserCircle,
} from 'lucide-react'

const CLIENT_NAV = [
  { label: 'Início',   href: '/cliente',          icon: LayoutDashboard, exact: true },
  { label: 'Dietas',   href: '/cliente/dietas',    icon: Utensils,        exact: false },
  { label: 'Treinos',  href: '/cliente/treinos',   icon: Dumbbell,        exact: false },
  { label: 'Progresso',href: '/cliente/progresso', icon: TrendingUp,      exact: false },
  { label: 'Perfil',   href: '/cliente/perfil',    icon: UserCircle,      exact: false },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16">
        {CLIENT_NAV.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : (pathname ?? '').startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
