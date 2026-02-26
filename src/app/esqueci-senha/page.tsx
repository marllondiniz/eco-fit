'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { translateAuthError } from '@/lib/auth-errors'
import AuthLayout from '@/components/AuthLayout'

export default function EsqueceuSenha() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/redefinir-senha`,
    })
    setCarregando(false)
    if (error) {
      setErro(translateAuthError(error.message))
      return
    }
    setEnviado(true)
  }

  if (enviado) {
    return (
      <AuthLayout
        titulo="E-mail enviado!"
        subtitulo="Verifique sua caixa de entrada"
      >
        <div className="space-y-4 text-center text-sm">
          <p className="text-foreground">
            Se existir uma conta com <strong className="text-primary font-semibold">{email}</strong>,
            você receberá um link para redefinir sua senha. O link expira em 1 hora.
          </p>
          <p className="text-muted-foreground dark:text-foreground/80 text-xs">
            Não recebeu? Verifique a pasta de spam ou{' '}
            <button
              type="button"
              onClick={() => setEnviado(false)}
              className="text-primary hover:opacity-90 font-medium"
            >
              tente novamente
            </button>
            .
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors mt-4 text-center"
          >
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Esqueceu a senha?"
      subtitulo="Informe seu e-mail e enviaremos um link para redefinir"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
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

        {erro && (
          <p className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-xl px-4 py-2.5">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors shadow-lg shadow-emerald-600/25 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {carregando ? 'Enviando...' : 'Enviar link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Lembrou a senha?{' '}
        <Link href="/" className="font-semibold text-primary hover:opacity-90">
          Voltar ao login
        </Link>
      </p>
    </AuthLayout>
  )
}
