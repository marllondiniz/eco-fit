import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, Settings2, Mail, Link2Icon } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'LB.FIT — Configurações' }

export default async function ConfiguracoesPage() {
  const supabase = await createSupabaseServerClient()

  const [
    { count: totalClientes },
    { count: totalProfissionais },
    { count: totalAdmins },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'personal'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Central de ajustes do LB.FIT — usuários, permissões e integrações.
          </p>
        </div>
      </div>

      {/* Usuários & Permissões */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-4 h-4 text-primary" />
            Usuários e permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/admin/usuarios">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Todos os usuários</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Visualizar e revisar papéis</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-600 dark:text-slate-200" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/profissionais">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Profissionais</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Convidar personal / nutricionista / ambos
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="text-sm font-medium text-foreground">Resumo rápido</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    {totalClientes ?? 0} clientes
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <UserCheck className="w-3 h-3" />
                    {totalProfissionais ?? 0} profissionais
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Settings2 className="w-3 h-3" />
                    {totalAdmins ?? 0} admins
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Integrações (placeholders configuráveis) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2Icon className="w-4 h-4 text-primary" />
            Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Aqui você poderá centralizar configurações de serviços externos usados pelo LB.FIT.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border border-dashed border-border rounded-xl p-3 flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">E-mail transacional</p>
                <p className="text-xs">
                  Configuração de provedores como Resend / SMTP para confirmação de conta, redefinição
                  de senha e notificações.
                </p>
              </div>
            </div>
            <div className="border border-dashed border-border rounded-xl p-3 flex items-start gap-2">
              <Settings2 className="w-4 h-4 mt-0.5 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">Canais de contato</p>
                <p className="text-xs">
                  Futuras integrações com WhatsApp, chatbot ou outros canais de suporte centralizados.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

