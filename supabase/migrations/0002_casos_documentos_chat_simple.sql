-- El Notebook Legal — Esquema Simplificado (sin pgvector)
-- Ejecutar esto si la extensión vector no está disponible

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CASOS (Expedientes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rama VARCHAR(50) NOT NULL,
  asunto TEXT,
  resumen TEXT,
  partes JSONB DEFAULT '[]'::JSONB,
  fechas_clave JSONB DEFAULT '[]'::JSONB,
  leyes_sugeridas TEXT[] DEFAULT ARRAY[]::TEXT[],
  confianza NUMERIC(3,2) DEFAULT 0.95,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_casos_rama ON casos(rama);
CREATE INDEX idx_casos_creado ON casos(creado_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DOCUMENTOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  contenido TEXT,
  duracion_segundos INT,
  timestamps BOOLEAN DEFAULT FALSE,
  idioma VARCHAR(10) DEFAULT 'es-MX',
  storage_path TEXT,
  storage_bucket VARCHAR(255) DEFAULT 'documentos',
  tamaño_bytes BIGINT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documentos_caso ON documentos(caso_id);
CREATE INDEX idx_documentos_tipo ON documentos(tipo);
CREATE INDEX idx_documentos_creado ON documentos(creado_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CHAT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  rol VARCHAR(20) NOT NULL,
  contenido TEXT NOT NULL,
  documentos_referenciados UUID[] DEFAULT ARRAY[]::UUID[],
  citas JSONB DEFAULT '[]'::JSONB,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_caso ON chat_mensajes(caso_id);
CREATE INDEX idx_chat_rol ON chat_mensajes(rol);
CREATE INDEX idx_chat_creado ON chat_mensajes(creado_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TIMELINE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  iso TEXT NOT NULL,
  titulo TEXT NOT NULL,
  detalle TEXT,
  severidad VARCHAR(20) DEFAULT 'info',
  documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_timeline_caso ON timeline_eventos(caso_id);
CREATE INDEX idx_timeline_iso ON timeline_eventos(iso);
CREATE INDEX idx_timeline_severidad ON timeline_eventos(severidad);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION actualizar_casos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_casos_updated_at
  BEFORE UPDATE ON casos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_casos_updated_at();

CREATE OR REPLACE FUNCTION actualizar_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_documentos_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir acceso anon (testing)
-- En producción: reemplazar con auth.uid()

CREATE POLICY "allow_all_casos" ON casos FOR ALL USING (TRUE);
CREATE POLICY "allow_all_documentos" ON documentos FOR ALL USING (TRUE);
CREATE POLICY "allow_all_chat" ON chat_mensajes FOR ALL USING (TRUE);
CREATE POLICY "allow_all_timeline" ON timeline_eventos FOR ALL USING (TRUE);
