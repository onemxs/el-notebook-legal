-- El Notebook Legal — Esquema de Casos, Documentos y Chat
-- Tablas para persistencia de expedientes, documentos y conversaciones de IA

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CASOS (Expedientes)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  rama VARCHAR(50) NOT NULL, -- 'penal', 'civil', 'mercantil', etc.
  asunto TEXT,
  resumen TEXT,

  -- Partes del caso (JSON array de {label, value})
  partes JSONB DEFAULT '[]'::JSONB,

  -- Fechas clave (JSON array de {label, value})
  fechas_clave JSONB DEFAULT '[]'::JSONB,

  -- Leyes sugeridas (JSON array de strings)
  leyes_sugeridas TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  confianza NUMERIC(3,2) DEFAULT 0.95,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Índices
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por rama
CREATE INDEX IF NOT EXISTS idx_casos_rama ON casos(rama);
CREATE INDEX IF NOT EXISTS idx_casos_creado ON casos(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DOCUMENTOS (Archivos del expediente: PDF, videos, transcripciones, etc.)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,

  nombre TEXT NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'pdf', 'video', 'transcription', 'text', 'image'
  contenido TEXT, -- Para tipos 'text' y 'transcription'; para PDF/video = NULL (Storage)

  -- Metadata de video (si tipo = 'video' o 'transcription')
  duracion_segundos INT, -- duración del video original
  timestamps BOOLEAN DEFAULT FALSE, -- si tiene [HH:MM:SS] format
  idioma VARCHAR(10) DEFAULT 'es-MX',

  -- Storage (si no es text/transcription)
  storage_path TEXT, -- ruta en Supabase Storage (ej: 'casos/uuid/documento.pdf')
  storage_bucket VARCHAR(255) DEFAULT 'documentos',

  -- RAG: vector embedding para búsqueda semántica (se genera con trigger)
  contenido_vector vector(1536),

  -- Metadata
  tamaño_bytes BIGINT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_documentos_caso ON documentos(caso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_creado ON documentos(creado_en DESC);

-- Índice para búsqueda de vectores (pgvector)
CREATE INDEX IF NOT EXISTS idx_documentos_vector ON documentos USING HNSW (contenido_vector vector_cosine_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CHAT (Conversaciones con el asistente de IA)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,

  rol VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
  contenido TEXT NOT NULL,

  -- Metadata para context
  documentos_referenciados UUID[] DEFAULT ARRAY[]::UUID[], -- IDs de documentos citados
  citas JSONB DEFAULT '[]'::JSONB, -- [{articulo, ley, texto}]

  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_caso ON chat_mensajes(caso_id);
CREATE INDEX IF NOT EXISTS idx_chat_rol ON chat_mensajes(rol);
CREATE INDEX IF NOT EXISTS idx_chat_creado ON chat_mensajes(creado_en DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TIMELINE (Línea del tiempo de eventos del caso)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,

  fecha TEXT NOT NULL, -- display date (ej: "5 may 2025")
  iso TEXT NOT NULL, -- ISO date for sorting (ej: "2025-05-05")
  titulo TEXT NOT NULL,
  detalle TEXT,
  severidad VARCHAR(20) DEFAULT 'info', -- 'info' | 'warning' | 'deadline'

  -- Relación con documento (opcional)
  documento_id UUID REFERENCES documentos(id) ON DELETE SET NULL,

  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_timeline_caso ON timeline_eventos(caso_id);
CREATE INDEX IF NOT EXISTS idx_timeline_iso ON timeline_eventos(iso);
CREATE INDEX IF NOT EXISTS idx_timeline_severidad ON timeline_eventos(severidad);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS (Actualizar timestamps, generar embeddings con pgvector)
-- ─────────────────────────────────────────────────────────────────────────────

-- Actualizar timestamp en casos
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

-- Actualizar timestamp en documentos
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
-- 6. ROW LEVEL SECURITY (RLS) — Cada usuario solo ve SUS casos
-- ─────────────────────────────────────────────────────────────────────────────

-- Por ahora, permitir acceso público (demos/testing)
-- En producción: agregar user_id a casos y usar auth.uid()

-- NOTA: Para producción con autenticación, agregar:
-- ALTER TABLE casos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
-- CREATE POLICY "usuarios_ven_sus_casos" ON casos FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "usuarios_acceden_a_documentos_de_sus_casos" ON documentos FOR ALL
--   USING (EXISTS(SELECT 1 FROM casos WHERE casos.id = documentos.caso_id AND casos.user_id = auth.uid()));

-- Enable RLS
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_eventos ENABLE ROW LEVEL SECURITY;

-- Policies (permitir anon por ahora)
CREATE POLICY "allow_all_casos" ON casos FOR ALL USING (TRUE);
CREATE POLICY "allow_all_documentos" ON documentos FOR ALL USING (TRUE);
CREATE POLICY "allow_all_chat" ON chat_mensajes FOR ALL USING (TRUE);
CREATE POLICY "allow_all_timeline" ON timeline_eventos FOR ALL USING (TRUE);
