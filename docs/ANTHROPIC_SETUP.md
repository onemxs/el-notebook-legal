# Análisis de documentos con IA (Anthropic) — para probar YA

> Esto te deja **analizar y transcribir documentos reales con Claude sin tocar
> Supabase**. Tu API key vive solo en tu computadora (un proxy local la usa); el
> navegador nunca la ve. ⏱️ 5 minutos.

## 1. Saca tu API key

- [ ] Entra a [console.anthropic.com](https://console.anthropic.com) → **API Keys** → crea una.
- [ ] Carga algo de saldo (con $5 USD sobra para muchísimas pruebas).

## 2. Ponla en `.env`

- [ ] Copia `.env.example` a `.env` (si no existe) y agrega:

```bash
ANTHROPIC_API_KEY=sk-ant-tu_api_key_aqui
ANTHROPIC_MODEL=claude-opus-4-8          # para pruebas baratas/rápidas: claude-haiku-4-5
```

> `claude-opus-4-8` = máxima calidad. `claude-haiku-4-5` = mucho más barato y rápido,
> ideal para pruebas. Cámbialo cuando quieras.

## 3. Reinicia y prueba

- [ ] Reinicia el servidor: detén `npm run dev` y vuelve a correrlo (lee el `.env` al arrancar).
- [ ] En el **Inicio**, arrastra un **PDF o imagen** de un documento legal a la zona
  "Arrastra el expediente del cliente".
- [ ] La IA lo lee de verdad → detecta la rama, extrae partes, fechas, asunto, resumen
  y lo transcribe. Confirma y se crea el expediente.
- [ ] También funciona **dentro de un caso**: arrastra un documento al Archivero y la
  IA lo analiza, lo comenta en el chat y alimenta la Línea del Tiempo.

## Qué puede leer

| Tipo | ¿Soportado? |
|------|-------------|
| **PDF** (`.pdf`) | ✅ lee texto e imágenes del PDF |
| **Imágenes** (`.png`, `.jpg`) | ✅ transcribe y analiza (incluye escaneos/fotos) |
| **Texto** (`.txt`) | ✅ |
| **Word** (`.docx`) | ❌ por ahora → guárdalo como PDF. (Si no, usa el modo demostración.) |

## Cómo funciona (seguridad)

```
Navegador  ──(documento en base64)──►  /api/analizar  ──(con tu API key)──►  Claude
   ▲                                   (proxy local, Node)                     │
   └───────────────  datos extraídos (JSON)  ◄──────────────────────────────┘
```

- La key **solo** está en el proxy local ([vite-plugin-claude.ts](../vite-plugin-claude.ts)),
  leída desde `.env`. **Nunca** se incluye en el bundle del navegador.
- Si no hay key, la app usa el **modo demostración** (detección por nombre de archivo)
  sin romperse.
- En producción, este mismo rol lo haría una **Edge Function de Supabase** (ver
  [SUPABASE_SETUP.md](SUPABASE_SETUP.md)); el proxy local es solo para desarrollo/pruebas.

## Notas

- El documento **no se almacena** — se procesa en el momento. (La persistencia
  opcional sería con Storage de Supabase, a futuro.)
- La temperatura está pensada para extracción literal; la IA no inventa nombres que
  no estén en el documento.
- ¿Errores? Mira la terminal donde corre `npm run dev`: el proxy imprime
  `[/api/analizar] ...` si algo falla (key inválida, tipo no soportado, etc.).
