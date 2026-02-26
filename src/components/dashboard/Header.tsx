'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, LogOut, UserCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from './Sidebar'
import type { UserRole } from '@/types/database'

const HOME_BY_ROLE: Record<UserRole, string> = {
  user:     '/cliente',
  personal: '/profissional',
  admin:    '/admin',
}

interface HeaderProps {
  name:       string | null
  email:      string | null
  role:       UserRole
  avatarUrl?: string | null
  pageTitle?: string
}

export function Header({ name, email, role, avatarUrl, pageTitle }: HeaderProps) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [saindo, setSaindo] = useState(false)

  async function handleLogout() {
    setSaindo(true)
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : email?.[0]?.toUpperCase() ?? 'U'

  const isClient = role === 'user'
  const homeHref = HOME_BY_ROLE[role]

  return (
    <>
      <header className="h-16 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border bg-card">

        {/* ── Left ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Hamburger — only for non-clients on mobile */}
          {!isClient && (
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo — apenas no mobile (no desktop fica só na sidebar, evita duplicação) */}
          <Link
            href={homeHref}
            className="md:hidden flex items-center shrink-0 select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            aria-label="Ir para início"
          >
            <span className="relative block h-8 w-[100px]">
              <Image
                src="/logo-preto.png"
                alt="ECOFIT"
                fill
                className="object-contain object-left dark:hidden"
                sizes="100px"
                priority
              />
              <Image
                src="/logo-branco.png"
                alt="ECOFIT"
                fill
                className="object-contain object-left hidden dark:block"
                sizes="100px"
                priority
              />
            </span>
          </Link>

          {/* Page title — desktop only; não exibir quando for o genérico "Dashboard" */}
          {pageTitle && pageTitle !== 'Dashboard' && (
            <h1 className="hidden md:block text-base font-semibold text-foreground truncate">
              {pageTitle}
            </h1>
          )}
        </div>

        {/* ── Right ────────────────────────────────────────── */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Avatar + dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 hover:bg-muted transition-colors"
                aria-label="Menu do usuário"
              >
                <Avatar className="w-8 h-8">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? 'Avatar'} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[130px] truncate">
                  {name ?? email ?? 'Usuário'}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? 'Avatar'} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{name ?? 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              </div>

              <DropdownMenuSeparator />

              {isClient && (
                <DropdownMenuItem asChild>
                  <Link href="/cliente/perfil" className="gap-2 cursor-pointer">
                    <UserCircle className="w-4 h-4" />
                    Meu perfil
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                disabled={saindo}
                className="gap-2 cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                {saindo ? 'Saindo...' : 'Sair'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile sidebar — only for non-client roles */}
      {!isClient && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Sidebar role={role} onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
