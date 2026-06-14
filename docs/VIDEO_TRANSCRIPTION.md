# Transcripción Automática de Videos — Audiencias & Declaraciones

> Sube videos de hasta 2 horas, la IA los transcribe automáticamente a texto con **timestamps exactos** ([HH:MM:SS]) para que encuentres al instante lo que dijeron. Luego se integra como un documento del caso para RAG inmediato. ⏱️ **10 minutos de setup**.

## 1. Obtén tu API key de OpenAI

- [ ] Ve a [platform.openai.com](https://platform.openai.com) → **API keys** → crea una nueva.
- [ ] Carga saldo (whisper es barato: ~$0.01 por minuto de audio).
- [ ] **IMPORTANTE**: Copia la key completa y guárdala — no volverá a aparecer.

## 2. Configura `.env`

Abre o crea el archivo `.env` en la raíz del proyecto (`/Users/onemxs/dyad-apps/Legal/.env`) y añade:

```bash
OPENAI_API_KEY=sk-proj-tu_api_key_aqui
# OPENAI_BASE_URL=https://api.openai.com/v1      # opcional (dejar como está si usas OpenAI directo)
```

Si usas un proxy o proveedor compatible (Azure, etc.), descomentar la línea de base URL.

## 3. Reinicia y prueba

- [ ] Detén `npm run dev` (Ctrl+C) si está corriendo.
- [ ] Vuelve a iniciar: `npm run dev`.
- [ ] Ve a **Archivero** (dentro de cualquier caso) o **Inicio** (dropzone principal).
- [ ] Arrastra un video de prueba (`.mp4`, `.mov`, `.mkv`) — máximo 2 GB / 2 horas.
- [ ] Verás: _"Procesando audio y transcribiendo video... Esto puede tomar unos minutos"_ + barra de progreso.
- [ ] Una vez terminada, aparece un documento con la transcripción completa con timestamps.

## Qué puedes subir

| Tipo | Soportado? | Nota |
|------|-----------|------|
| **MP4** (`.mp4`) | ✅ | Formato estándar de video |
| **MOV** (`.mov`) | ✅ | Grabaciones de iPhone/Mac |
| **Matroska** (`.mkv`) | ✅ | Contenedor flexible |
| **WebM** (`.webm`) | ✅ | Códecs variados |
| **Duración** | ✅ Hasta 2 horas | Archivos más largos pueden fallar |
| **Idioma** | ✅ Español de México | Whisper también entiende otros idiomas |

## Cómo funciona (arquitectura)

```
Navegador
  ↓
  Arrastra video.mp4
  ↓
/api/transcribe-video (proxy local, Node)
  ↓
OpenAI Whisper API (en la nube)
  ↓ (audio → JSON con timestamps)
Procesa & formatea
  ↓
[01:23:45] El trabajador fue despedido...
[01:24:12] Sin previo aviso...
  ↓
Documento "Transcripción: video.mp4"
  ↓
Archivero del caso

```

- **API key**: Solo en el servidor local (`.env`), nunca en el navegador.
- **Archivo de video**: Se sube como multipart, se procesa en memoria, se borra al terminar.
- **Timestamps**: Whisper devuelve la duración exacta de cada frase hablada; los formateamos a `[HH:MM:SS]`.
- **Integración**: La transcripción se agrega como un documento `.txt` al Archivero, listo para RAG.

## Notas técnicas

- **Idioma automático**: Aunque configuramos español (`es`), Whisper detecta automáticamente si hay cambios.
- **Velocidad**: Depende de la duración del video. Ejemplo:
  - 5 minutos: ~10–15 segundos.
  - 1 hora: ~1–2 minutos.
  - 2 horas: ~3–5 minutos.
- **Costo**: $0.01 USD por minuto de audio. Un video de 1 hora = ~$0.60.
- **Errores**: Si falla, mira la terminal donde corre `npm run dev` — verás logs `[/api/transcribe-video] ...`.
- **Formatos de audio**: Whisper soporta MP3, MP4, MPEG, MPGA, M4A, OGG, FLAC, WAV, WebM internamente; nosotros enviamos el contenedor de video completo y Whisper extrae el audio.

## Próximos pasos

Cuando esté listo Supabase:
1. La transcripción se guardará en `documentos` vinculado al caso.
2. Se generarán vectores automáticamente (pgvector).
3. El asistente de IA podrá buscar frases exactas: _"¿Qué dijo sobre el contrato?"_ → busca en los timestamps.

Por ahora, la transcripción se almacena en el Archivero del caso como un documento de texto normal.
