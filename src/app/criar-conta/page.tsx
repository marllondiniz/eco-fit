'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { translateAuthError } from '@/lib/auth-errors'
import AuthLayout from '@/components/AuthLayout'
import type { ProfessionalType } from '@/types/database'

function CriarContaForm() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? null

  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [validandoToken, setValidandoToken] = useState(false)
  const [tokenValido, setTokenValido] = useState<boolean | null>(null)
  const [roleConvite, setRoleConvite] = useState<string | null>(null)
  const [tipoProfConvite, setTipoProfConvite] = useState<ProfessionalType | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (!token) return
    async function validarToken() {
      setValidandoToken(true)
      const { data, error } = await supabase
        .from('invitations')
        .select('email, role, professional_type, used_at, expires_at')
        .eq('token', token)
        .single()

      if (error || !data) {
        setTokenValido(false)
        setValidandoToken(false)
        return
      }

      if (data.used_at) {
        setTokenValido(false)
        setErro('Este convite já foi utilizado.')
        setValidandoToken(false)
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setTokenValido(false)
        setErro('Este convite expirou.')
        setValidandoToken(false)
        return
      }

      setTokenValido(true)
      setEmail(data.email)
      setRoleConvite(data.role)
      setTipoProfConvite((data as any).professional_type ?? null)
      setValidandoToken(false)
    }

    validarToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setCarregando(true)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { full_name: nome },
      },
    })

    if (signUpError) {
      setErro(translateAuthError(signUpError.message))
      setCarregando(false)
      return
    }

    // Se havia convite, atualizar role e marcar convite como usado
    if (token && tokenValido && signUpData.user && roleConvite) {
      await supabase
        .from('profiles')
        .update({
          role: roleConvite,
          professional_type: tipoProfConvite ?? 'both',
        })
        .eq('id', signUpData.user.id)

      await supabase
        .from('invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token)
    }

    setCarregando(false)
    setSucesso(true)
  }

  if (validandoToken) {
    return (
      <AuthLayout titulo="Criar conta" subtitulo="Verificando seu convite...">
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        </div>
      </AuthLayout>
    )
  }

  // Sem token → acesso direto bloqueado
  if (!token) {
    return (
      <AuthLayout titulo="Acesso restrito" subtitulo="O cadastro é exclusivo via convite.">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Para criar uma conta no LB.FIT você precisa receber um convite de um administrador ou profissional.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-center text-sm"
          >
            Ir para o login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // Token inválido / expirado / já usado
  if (tokenValido === false) {
    return (
      <AuthLayout titulo="Convite inválido" subtitulo="Não foi possível utilizar este convite.">
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {erro ?? 'O link de convite é inválido, expirou ou já foi utilizado.'}
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-center text-sm"
          >
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (sucesso) {
    return (
      <AuthLayout titulo="Conta criada!" subtitulo="Verifique seu e-mail para confirmar o cadastro.">
        <div className="space-y-4 text-center text-sm">
          <p className="text-foreground">
            Enviamos um link de confirmação para{' '}
            <strong className="text-primary font-semibold">{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-center"
          >
            Ir para o login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Aceitar convite"
      subtitulo={`Você foi convidado como ${
        roleConvite === 'personal'
          ? tipoProfConvite === 'nutritionist'
            ? 'nutricionista'
            : tipoProfConvite === 'personal'
              ? 'personal trainer'
              : 'profissional (personal + nutricionista)'
          : 'cliente'
      }. Preencha seus dados.`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-foreground mb-1.5">
            Nome completo
          </label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            required
            autoComplete="name"
            className="w-full px-4 py-3 rounded-xl border border-border bg-card dark:bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-shadow"
          />
        </div>

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
            readOnly={!!(token && tokenValido)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card dark:bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-shadow disabled:opacity-70 read-only:bg-muted read-only:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-foreground mb-1.5">
            Senha
          </label>
          <div className="relative">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
            Confirmar senha
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
          {carregando ? 'Criando conta...' : 'Aceitar convite e criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href="/" className="font-semibold text-primary hover:opacity-90">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}

export default function CriarConta() {
  return (
    <Suspense fallback={
      <AuthLayout titulo="Criar conta" subtitulo="Carregando...">
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        </div>
      </AuthLayout>
    }>
      <CriarContaForm />
    </Suspense>
  )
}
