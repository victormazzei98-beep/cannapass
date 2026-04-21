-- Tabela de diretório: médicos, associações e advogados especializados
CREATE TABLE IF NOT EXISTS directory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('medico', 'associacao', 'advogado')),
  name TEXT NOT NULL,
  specialty TEXT,
  state TEXT,
  city TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  email TEXT,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active directory" ON directory
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage directory" ON directory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tabela de configurações da plataforma (key-value genérico)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read app config" ON app_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage app config" ON app_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Valores padrão para contatos de suporte
INSERT INTO app_config (key, value) VALUES
  ('support_whatsapp', ''),
  ('support_phone', ''),
  ('support_email', 'suporte@cannapass.com.br'),
  ('support_hours', 'Seg–Sex, 9h–18h')
ON CONFLICT (key) DO NOTHING;
