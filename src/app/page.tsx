'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthLayout from '@/components/AuthLayout'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setCarregando(false)
    if (error) {
      setErro(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos. Tente novamente.'
        : error.message
      )
      return
    }
    setSucesso(true)
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 1200)
  }

  if (sucesso) {
    return (
      <AuthLayout
        titulo="Login realizado!"
        subtitulo="Redirecionando..."
      >
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-foreground font-medium">Login realizado com sucesso.</p>
          <p className="text-muted-foreground text-sm mt-1">Você será redirecionado em instantes...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Entre na sua conta"
      subtitulo="Use seu e-mail e senha para continuar"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card dark:bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-shadow"
          />
        </div>

        <div>
          <label
            htmlFor="senha"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Senha
          </label>
          <div className="relative">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card dark:bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-shadow"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        {erro && (
          <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-xl px-4 py-2.5">
            {erro}
          </p>
        )}

        <div className="flex justify-end">
          <Link
            href="/esqueci-senha"
            className="text-sm text-primary hover:opacity-90 font-medium"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors shadow-lg shadow-emerald-600/25 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{' '}
        <Link
          href="/criar-conta"
          className="font-semibold text-primary hover:opacity-90"
        >
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  )
}
