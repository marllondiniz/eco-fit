'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Upload, CheckCircle, Clock } from 'lucide-react'
import type { ProfessionalDocument } from '@/types/database'

export default function DocumentosPage() {
  const [documento, setDocumento] = useState<ProfessionalDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [tipo, setTipo] = useState<'CRN' | 'CREF'>('CRN')
  const [numero, setNumero] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('professional_documents')
        .select('*')
        .eq('professional_id', user.id)
        .single()

      if (data) {
        setDocumento(data as ProfessionalDocument)
        setTipo(data.document_type as 'CRN' | 'CREF')
        setNumero(data.document_number ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!numero.trim()) {
      setErro('Informe o número do registro.')
      return
    }

    setErro(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let fileUrl = documento?.file_url ?? null

    if (arquivo) {
      const ext = arquivo.name.split('.').pop()
      const path = `documents/${user.id}/${tipo}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('professional-docs')
        .upload(path, arquivo, { upsert: true })

      if (uploadError) {
        setErro(`Erro ao enviar arquivo: ${uploadError.message}`)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage.from('professional-docs').getPublicUrl(path)
      fileUrl = urlData.publicUrl
    }

    const payload = {
      professional_id: user.id,
      document_type: tipo,
      document_number: numero.trim(),
      file_url: fileUrl,
    }

    const { error } = documento
      ? await supabase.from('professional_documents').update(payload).eq('id', documento.id)
      : await supabase.from('professional_documents').insert(payload)

    if (error) {
      setErro('Erro ao salvar documento.')
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Documentos Profissionais</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Envie seu registro CRN ou CREF para validação profissional.
        </p>
      </div>

      {/* Status */}
      {documento && (
        <Card className="border-0 bg-slate-50">
          <CardContent className="p-4 flex items-center gap-3">
            {documento.verified_at ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Documento verificado</p>
                  <p className="text-xs text-muted-foreground">Sua conta está validada como profissional.</p>
                </div>
                <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-0">Verificado</Badge>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Aguardando verificação</p>
                  <p className="text-xs text-muted-foreground">Seu documento está em análise pelo admin.</p>
                </div>
                <Badge variant="secondary" className="ml-auto">Pendente</Badge>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {documento ? 'Atualizar documento' : 'Enviar documento'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Tipo de registro</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as 'CRN' | 'CREF')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRN">CRN — Conselho Regional de Nutrição</SelectItem>
                  <SelectItem value="CREF">CREF — Conselho Regional de Educação Física</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numero">Número do registro *</Label>
              <Input
                id="numero"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder={tipo === 'CRN' ? 'Ex: CRN-3 12345/P' : 'Ex: CREF 012345-G/SP'}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Documento (PDF ou imagem)</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
              >
                {arquivo ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">{arquivo.name}</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm">Clique para selecionar arquivo</p>
                    <p className="text-xs mt-1">PDF, JPG ou PNG · Máx. 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setArquivo(e.target.files?.[0] ?? null)}
              />
              {documento?.file_url && !arquivo && (
                <p className="text-xs text-muted-foreground">
                  Arquivo atual já enviado.{' '}
                  <a href={documento.file_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    Visualizar
                  </a>
                </p>
              )}
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                {erro}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                Documento salvo com sucesso.
              </p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? 'Enviando...' : documento ? 'Atualizar documento' : 'Enviar documento'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
