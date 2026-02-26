'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole, ProfessionalType, Profile } from '@/types/database'
import { useProfile } from '@/hooks/useProfile'
import {
  LayoutDashboard,
  Users,
  Utensils,
  Dumbbell,
  FileText,
  ClipboardCheck,
  UserCheck,
  Settings,
  TrendingUp,
  UserCircle,
} from 'lucide-react'

const HOME_BY_ROLE: Record<UserRole, string> = {
  user: '/cliente',
  personal: '/profissional',
  admin: '/admin',
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  personal: [
    { label: 'Visão Geral', href: '/profissional', icon: LayoutDashboard },
    { label: 'Clientes', href: '/profissional/clientes', icon: Users },
    { label: 'Dietas', href: '/profissional/dietas', icon: Utensils },
    { label: 'Treinos', href: '/profissional/treinos', icon: Dumbbell },
    { label: 'Supervisão', href: '/profissional/supervisao', icon: ClipboardCheck },
    { label: 'Documentos', href: '/profissional/documentos', icon: FileText },
  ],
  user: [
    { label: 'Início', href: '/cliente', icon: LayoutDashboard },
    { label: 'Minhas Dietas', href: '/cliente/dietas', icon: Utensils },
    { label: 'Meus Treinos', href: '/cliente/treinos', icon: Dumbbell },
    { label: 'Progresso', href: '/cliente/progresso', icon: TrendingUp },
    { label: 'Perfil', href: '/cliente/perfil', icon: UserCircle },
  ],
  admin: [
    { label: 'Visão Geral', href: '/admin', icon: LayoutDashboard },
    { label: 'Profissionais', href: '/admin/profissionais', icon: UserCheck },
    { label: 'Usuários', href: '/admin/usuarios', icon: Users },
  ],
}

interface SidebarProps {
  role: UserRole
  onClose?: () => void
}

export function Sidebar({ role, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { profile } = useProfile()
  const profType: ProfessionalType | null =
    role === 'personal' ? (profile?.professional_type ?? 'both') : null

  let navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.user

  // Para profissionais, filtramos Dietas/Treinos conforme o tipo
  if (role === 'personal') {
    navItems = NAV_BY_ROLE.personal.filter((item) => {
      if (item.href.startsWith('/profissional/dietas')) {
        return profType === 'nutritionist' || profType === 'both'
      }
      if (item.href.startsWith('/profissional/treinos')) {
        return profType === 'personal' || profType === 'both'
      }
      return true
    })
  }
  const homeHref = HOME_BY_ROLE[role] ?? '/cliente'

  const roleLabel: Record<UserRole, string> = {
    personal: 'Profissional',
    user: 'Cliente',
    admin: 'Admin',
  }

  return (
    <aside className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border flex items-center gap-2">
        <Link
          href={homeHref}
          onClick={onClose}
          className="flex items-center shrink-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          aria-label="Ir para início"
        >
          <span className="relative block h-8 w-[100px]">
            <Image
              src="/logo-preto.png"
              alt="LB.FIT"
              fill
              className="object-contain object-left dark:hidden"
              sizes="100px"
              priority
            />
            <Image
              src="/logo-branco.png"
              alt="LB.FIT"
              fill
              className="object-contain object-left hidden dark:block"
              sizes="100px"
              priority
            />
          </span>
        </Link>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {roleLabel[role]}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/profissional' ||
            item.href === '/cliente' ||
            item.href === '/admin'
              ? pathname === item.href
              : (pathname ?? '').startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">© LB.FIT 2025</p>
      </div>
    </aside>
  )
}
