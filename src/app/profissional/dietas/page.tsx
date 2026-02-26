'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Utensils, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from '@/lib/date-utils'

const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', review: 'Em revisão', sent: 'Enviado' }
const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'default'> = {
  draft: 'secondary', review: 'outline', sent: 'default',
}

export default function DietasPage() {
  const [dietas, setDietas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('diets')
      .select('*, profiles!diets_client_id_fkey(full_name, email)')
      .eq('professional_id', user!.id)
      .order('updated_at', { ascending: false })
    setDietas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleExcluir(id: string) {
    setExcluindoId(id)
    await supabase.from('diets').delete().eq('id', id)
    setDietas(prev => prev.filter(d => d.id !== id))
    setExcluindoId(null)
    setConfirmId(null)
  }

  const counts = {
    draft: dietas.filter(d => d.status === 'draft').length,
    review: dietas.filter(d => d.status === 'review').length,
    sent: dietas.filter(d => d.status === 'sent').length,
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dietas</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {dietas.length} planos · {counts.draft} rascunho · {counts.review} em revisão · {counts.sent} enviado
          </p>
        </div>
        <Link href="/profissional/dietas/nova">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="w-4 h-4" />
            Nova dieta
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-5 h-16 bg-muted/30 animate-pulse rounded-xl" /></Card>
          ))}
        </div>
      ) : !dietas.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Utensils className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma dieta criada ainda.</p>
            <Link href="/profissional/dietas/nova">
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Criar primeira dieta
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {dietas.map((dieta) => (
            <Card key={dieta.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <p className="font-semibold text-foreground truncate">{dieta.name}</p>
                      <Badge variant={STATUS_VARIANT[dieta.status]} className="text-xs flex-shrink-0">
                        {STATUS_LABEL[dieta.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {dieta.objective && (
                        <span className="text-xs text-muted-foreground">{dieta.objective}</span>
                      )}
                      {dieta.profiles && (
                        <span className="text-xs text-muted-foreground">
                          Cliente: {dieta.profiles.full_name ?? dieta.profiles.email}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(dieta.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Link href={`/profissional/dietas/${dieta.id}/editar`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-2 sm:px-3">
                        <Pencil className="w-3 h-3" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => setConfirmId(dieta.id)}
                      disabled={excluindoId === dieta.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Link href={`/profissional/dietas/${dieta.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={open => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dieta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todas as refeições e alimentos desta dieta serão apagados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && handleExcluir(confirmId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
