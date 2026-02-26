'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Target, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

interface ClienteCardComMetaProps {
  cliente: { id: string; full_name: string | null; email: string | null; created_at: string }
  counts: { dietas: number; treinos: number }
  weeklyTarget: number | null
}

export function ClienteCardComMeta({ cliente, counts, weeklyTarget }: ClienteCardComMetaProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(String(weeklyTarget ?? 3))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials = cliente.full_name
    ? cliente.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : cliente.email?.[0]?.toUpperCase() ?? 'C'

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/profissional/cliente-meta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: cliente.id, weeklyTarget: parseInt(value, 10) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao salvar.')
        return
      }
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">
              {cliente.full_name ?? 'Sem nome'}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{cliente.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Desde {formatDate(cliente.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary" className="text-xs gap-1">
            {counts.dietas} {counts.dietas === 1 ? 'dieta' : 'dietas'}
          </Badge>
          <Badge variant="secondary" className="text-xs gap-1">
            {counts.treinos} {counts.treinos === 1 ? 'treino' : 'treinos'}
          </Badge>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs gap-1">
                <Target className="w-3 h-3" />
                Meta: {weeklyTarget ?? 3}/sem
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Meta de treinos por semana</DialogTitle>
                <DialogDescription>
                  Defina quantos treinos por semana este cliente deve realizar (2 a 7).
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label className="text-sm">Treinos por semana</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x por semana
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
