-- Aeroportos de destino e de retorno da viagem (só se aplicam a transporte aéreo)
alter table public.travel_data
  add column if not exists airport_destination text,
  add column if not exists airport_return text;

comment on column public.travel_data.airport_destination is 'Aeroporto de desembarque na ida (código IATA + nome), quando transport_type = air';
comment on column public.travel_data.airport_return is 'Aeroporto de embarque na volta (código IATA + nome), quando houver retorno aéreo';

-- verify_qr_token passa a devolver os aeroportos para a verificação pública
CREATE OR REPLACE FUNCTION public.verify_qr_token(lookup_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'valid', CASE
      WHEN q.is_active AND q.expires_at > now() AND p.status = 'approved' THEN true
      ELSE false
    END,
    'expired', CASE WHEN q.expires_at <= now() THEN true ELSE false END,
    'qr_id', q.id,
    'patient_id', q.patient_id,
    'patient_name', q.patient_name,
    'cpf_masked', q.cpf_masked,
    'via', q.via,
    'product', q.product,
    'quantity', q.quantity,
    'legal_reference', q.legal_reference,
    'is_active', q.is_active,
    'expires_at', q.expires_at,
    'created_at', q.created_at,
    'status', p.status,
    'registration_id', p.registration_id,
    'origin', t.origin,
    'destination', t.destination,
    'departure_date', t.departure_date,
    'transport_type', t.transport_type,
    'flight_or_bus', t.flight_or_bus,
    'airport_destination', t.airport_destination,
    'airport_return', t.airport_return
  ) INTO result
  FROM qr_codes q
  JOIN patients p ON p.id = q.patient_id
  LEFT JOIN travel_data t ON t.qr_code_id = q.id
  WHERE q.token = lookup_token;

  IF result IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Token nao encontrado');
  END IF;

  RETURN result;
END;
$function$;
