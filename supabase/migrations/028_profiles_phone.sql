-- 028: Adicionar campo phone na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;
