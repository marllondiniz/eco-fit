/**
 * Retorna a data de hoje no fuso do usuário no formato YYYY-MM-DD.
 * Evita usar UTC (toISOString), que em produção faz o dia "adiantar" à noite.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Dia da semana no fuso local: 'mon' (Segunda) até 'sun' (Domingo). */
export function getLocalDayOfWeek(date: Date = new Date()): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' {
  const day = date.getDay() // 0 = Domingo, 1 = Segunda, ...
  const map: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[day]
}

/** Segunda-feira da semana atual (fuso local). */
export function getLocalWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  return getLocalDateString(mon)
}

/** Primeiro dia do mês atual (fuso local). */
export function getLocalMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/** Retorna as datas (YYYY-MM-DD) de uma semana a partir da segunda-feira. */
export function getWeekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return getLocalDateString(d)
  })
}

/** Quantidade de dias no mês (y, m em 1-12). */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  if (hours < 24) return `há ${hours}h`
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  if (days < 30) return `há ${Math.floor(days / 7)} sem.`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
