-- Migration 031: ampliar workouts.label e client_workout_schedule.workout_label para A-F
-- Permite divisões A/B/C/D, A/B/C/D/E e A/B/C/D/E/F
-- Execute no Supabase Dashboard > SQL Editor

alter table public.workouts
  drop constraint if exists workouts_label_check,
  add constraint workouts_label_check check (label in ('A','B','C','D','E','F'));

alter table public.client_workout_schedule
  drop constraint if exists client_workout_schedule_workout_label_check,
  add constraint client_workout_schedule_workout_label_check check (workout_label in ('A','B','C','D','E','F'));
