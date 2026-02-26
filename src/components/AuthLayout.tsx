'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

const ThemeToggle = dynamic(
  () => import('@/components/ThemeToggle').then((m) => ({ default: m.ThemeToggle })),
  { ssr: false }
)

type AuthLayoutProps = {
  titulo: string
  subtitulo?: string
  children: ReactNode
}

export default function AuthLayout({ titulo, subtitulo, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-400/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-6 sm:p-8 md:p-10 border border-border">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label="LB.FIT - Ir para login"
            >
              <span className="relative block h-10 w-[130px]">
                <Image
                  src="/logo-preto.png"
                  alt="LB.FIT"
                  fill
                  className="object-contain object-center dark:hidden"
                  sizes="130px"
                  priority
                />
                <Image
                  src="/logo-branco.png"
                  alt="LB.FIT"
                  fill
                  className="object-contain object-center hidden dark:block"
                  sizes="130px"
                  priority
                />
              </span>
            </Link>
            <h2 className="text-lg font-semibold text-foreground mt-4">{titulo}</h2>
            {subtitulo && (
              <p className="text-muted-foreground dark:text-foreground/90 mt-1 text-sm">{subtitulo}</p>
            )}
          </div>
          {children}
        </div>
        <p className="text-center text-white/60 dark:text-white/50 text-xs mt-6">
          © LB.FIT — Saúde e sustentabilidade
        </p>
      </div>
    </div>
  )
}
