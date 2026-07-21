-- A renovação de cadastro seta status = 'renewal_pending' (STATUS.RENEWAL_PENDING no
-- frontend), mas o check constraint de patients.status não incluía esse valor —
-- quebrando o envio da renovação com "patients_status_check violation".
alter table public.patients drop constraint if exists patients_status_check;
alter table public.patients add constraint patients_status_check
  check (status = any (array['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'renewal_pending'::text]));
