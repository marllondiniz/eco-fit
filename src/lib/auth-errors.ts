/**
 * Traduz mensagens de erro comuns do Supabase Auth e da API para português.
 */
const MAP: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos. Tente novamente.',
  'User already registered': 'Este e-mail já está cadastrado. Faça login ou use "Esqueceu a senha?".',
  'Email not confirmed': 'Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.',
  'Invalid email or password': 'E-mail ou senha incorretos. Tente novamente.',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
  'New password should be different from the old password': 'A nova senha deve ser diferente da atual.',
  'Token has expired or is invalid': 'Link inválido ou expirado. Solicite um novo link para redefinir sua senha.',
  'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
  'Signup requires a valid password': 'Informe uma senha válida.',
  'User already exists': 'Este e-mail já está cadastrado.',
  'Forbidden': 'Acesso negado.',
  'JWT expired': 'Sua sessão expirou. Faça login novamente.',
}

const FALLBACK = 'Ocorreu um erro. Tente novamente.'

export function translateAuthError(message: string | undefined): string {
  if (!message) return FALLBACK
  const trimmed = message.trim()
  for (const [en, pt] of Object.entries(MAP)) {
    if (trimmed === en || trimmed.toLowerCase().includes(en.toLowerCase())) return pt
  }
  return FALLBACK
}
