'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { translateAuthError } from '@/lib/auth-errors'
import AuthLayout from '@/components/AuthLayout'

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [sessaoValida, setSessaoValida] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessaoValida(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessaoValida(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setCarregando(false)
    if (error) {
      setErro(translateAuthError(error.message))
      return
    }
    setSucesso(true)
  }

  if (sessaoValida === null) {
    return (
      <AuthLayout titulo="Redefinir senha" subtitulo="Carregando...">
        <div className="text-center text-muted-foreground py-8">Aguarde...</div>
      </AuthLayout>
    )
  }

  if (sessaoValida === false) {
    return (
      <AuthLayout
        titulo="Link inválido ou expirado"
        subtitulo="Solicite um novo link para redefinir sua senha"
      >
        <Link
          href="/esqueci-senha"
          className="block w-full py-3.5 text-center rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
        >
          Solicitar novo link
        </Link>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="font-semibold text-primary hover:opacity-90">
            Voltar ao login
          </Link>
        </p>
      </AuthLayout>
    )
  }

  if (sucesso) {
    return (
      <AuthLayout
        titulo="Senha alterada!"
        subtitulo="Sua senha foi redefinida com sucesso."
      >
        <Link
          href="/"
          className="block w-full py-3.5 text-center rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
        >
          Ir para o login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Nova senha"
      subtitulo="Digite e confirme sua nova senha"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="novaSenha" className="block text-sm font-medium text-foreground mb-1.5">
            Nova senha
          </label>
          <div className="relative">
            <input
              id="novaSenha"
              type={mostrarSenha ? 'text' : 'password'}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoComplete="new-password"
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

        <div>
          <label htmlFor="confirmarSenha" className="block text-sm font-medium text-foreground mb-1.5">
            Confirmar nova senha
          </label>
          <input
            id="confirmarSenha"
            type={mostrarSenha ? 'text' : 'password'}
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            placeholder="Repita a senha"
            required
            autoComplete="new-password"
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
          {carregando ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/" className="font-semibold text-primary hover:opacity-90">
          Voltar ao login
        </Link>
      </p>
    </AuthLayout>
  )
}
