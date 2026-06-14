# Brief de Diseño — **El Notebook Legal**
### Para rediseñar la interfaz en Google Stitch

> Objetivo en una frase: que se sienta **caro, sobrio y fácil** — un *atelier jurídico digital* de alta gama, no otro SaaS genérico hecho con plantilla de IA.

---

## 0. Cómo usar este documento en Stitch

Stitch diseña **pantalla por pantalla**. La forma recomendada:

1. Primero pega el **Prompt de Tema / Estilo** (sección 6.1) para fijar el lenguaje visual.
2. Luego pega cada **prompt de pantalla** (sección 6.2) una por una.
3. Los prompts listos para pegar están **en inglés** (Stitch rinde mejor así), pero **todos los textos visibles van en español** (la app es para abogados mexicanos). No traduzcas las etiquetas.
4. Pídele variaciones si algo se ve genérico, citando la sección 2 ("qué evitar").

---

## 1. Qué es el producto

**El Notebook Legal** es un espacio de trabajo jurídico inteligente para abogados de México (estilo "NotebookLM legal"). El abogado arrastra el expediente de su cliente, la IA lo lee, extrae los datos y detecta la rama del derecho; luego trabaja el caso en una sola pantalla de tres paneles con un asistente que **nunca alucina**: cada respuesta cita el texto literal de la ley.

**Usuario:** abogados litigantes y despachos. Contexto: trabajo de escritorio, lectura de textos legales largos, redacción de documentos formales. Tono: profesional, confiable, con peso institucional pero moderno y veloz.

**Cubre 9 ramas del derecho mexicano:** Penal, Electoral, Laboral, Civil, Mercantil, Administrativo, Fiscal, Amparo, Constitucional.

---

## 2. Dirección de arte — "que se vea caro" (LA SECCIÓN MÁS IMPORTANTE)

### El sentimiento objetivo
Imagina la papelería de un despacho de abogados de prestigio + una app de banca privada (tipo Mercury) + una revista editorial. **Herencia del papel y la imprenta legal, ejecutada de forma digital, minimalista y veloz.** Lujo por *restricción*, no por adornos.

### ❌ Qué EVITAR (esto es lo que lo hace ver "genérico / hecho por IA")
- Azul SaaS brillante por defecto y **gradientes morado→rosa**.
- Todas las tarjetas iguales, mismo radio, misma sombra suave por todos lados.
- **Emojis como iconos**; ilustraciones 3D de "blobs"; mascotas.
- Hero centrado con un botón gigante y subtítulo genérico.
- "Glassmorphism" usado como decoración sin propósito.
- Espaciado uniforme sin jerarquía: todo del mismo tamaño y peso.
- Texto de relleno (lorem ipsum) → usa los textos reales en español de este brief.

### ✅ Qué SÍ (señales de producto caro)
- **Paleta casi monocromática y cálida** + UN acento sobrio y profundo. Neutros con matiz (hueso/marfil/tinta), no gris frío de plantilla.
- **Tipografía editorial con carácter**: una *serif* de gravitas para titulares y lectura de leyes; una *grotesca* refinada para la interfaz. Contraste de escala dramático.
- **Detalles finos de imprenta**: bordes hairline de 1px, **versalitas con letter-spacing** en etiquetas, **números tabulares**, alineación impecable, mucho aire en blanco.
- **Materialidad sutil**: sombras realistas y suaves (no la sombra default), profundidad por capas, y una **textura de papel apenas perceptible** en las superficies de lectura (editor y visor de artículos).
- **Layout editorial asimétrico**: encabezados fuertes alineados a la izquierda, no todo centrado.
- **Un "elemento firma"** reconocible: las píldoras de fundamento legal y el visor de "texto literal verificado" tratados como un sello de autenticidad (la pieza memorable del producto).
- **Microinteracciones cuidadas**: transiciones con *spring*, estados hover/press deliberados, 150–250 ms.

### Referencias de lenguaje visual
Linear (precisión y restricción) · Mercury / Stripe (confianza financiera) · Arc (calidez moderna) · una revista editorial premium (jerarquía tipográfica) · papelería de bufete clásico (gravitas). **Sin** dribbble-SaaS-genérico.

---

## 3. Sistema de diseño

### 3.1 Color (modo claro por defecto — el usuario NO quiere que se vea oscuro)
> Regla dura: **nunca negro puro `#000000`, nunca tonos dorados.**

**Paleta recomendada "Marfil & Tinta" (cálida, cara):**
| Rol | Hex | Uso |
|---|---|---|
| Lienzo base | `#F4F2EC` | Fondo de la app (hueso cálido; alternativa neutra: `#F5F5F5`) |
| Superficie / panel | `#FFFFFF` o marfil `#FBFAF7` | Tarjetas, paneles |
| Superficie de lectura | `#FBF9F4` | Editor y visor de artículos (papel cálido) |
| Tinta (texto) | `#1C1B19` | Texto principal (negro cálido, NO `#000`) |
| Tinta media | `#6B6862` | Texto secundario, etiquetas |
| Hairline | `#E6E3DC` | Bordes finos 1px (cálido) |
| **Acento principal** | `#1E3A5F` (azul marino tinta) | Acciones, estados activos. *Sobrio y profundo.* |
| Acento brillante (opcional) | `#0A66C2` | Solo para el CTA principal si se quiere más "vivo" |
| Titanio (neutro frío sutil) | `#5B6470` | Acento secundario |
| Éxito | `#2F6B4F` (verde profundo) | Confirmaciones |
| Peligro | `#9B2C2C` (rojo oxblood) | Plazos vencidos, destructivo |
| Advertencia | `#9A6B1F` (ámbar quemado, NO dorado) | Contradicciones |

**Modo oscuro (alternable, secundario):** lienzo pizarra cálida `#16151A`, paneles `#1E1D24` con desenfoque, tinta hueso `#F3F1EC`, acento azul claro `#6E97C9`. Diseñar claro y oscuro como pareja.

### 3.2 Tipografía (clave para NO verse genérico — evita Inter "pelón")
- **Titulares / display / lectura de leyes (serif con carácter):** `Fraunces` (variable, optical sizing — se ve editorial y caro). Alternativas: `Spectral`, `Newsreader`.
- **Interfaz, botones, etiquetas (grotesca refinada):** `Hanken Grotesk` o `Geist` o `General Sans`. (Si se usa Inter, usarlo con intención y tracking, no por defecto.)
- **Lectura de documentos legales:** serif a `17px`, interlineado `1.65`, medida 66–72 caracteres.
- **Etiquetas pequeñas:** VERSALITAS, `11px`, `letter-spacing: 0.08em`, color tinta media.
- **Números (fechas, montos, plazos):** *tabular figures* siempre.
- Escala tipográfica con **contraste fuerte**: p. ej. 12 · 14 · 16 · 20 · 28 · 40 · 56.

### 3.3 Espaciado, grid y forma
- Sistema base **8 px** (4 px para ajustes finos).
- **Radios:** contenidos `10–12px`, contenedores `16px`. Consistencia total (nada de mezclar radios al azar).
- **Bordes hairline 1px** como recurso principal de separación (más elegante que sombras pesadas).
- **Sombras:** suaves y realistas, en 2 niveles máximo. Ej.: `0 1px 2px rgba(28,27,25,.04), 0 8px 24px rgba(28,27,25,.06)`.
- Generosidad de aire: los títulos respiran, las secciones tienen separación clara.

### 3.4 Iconografía y motion
- **Iconos:** set lineal fino y consistente (Lucide / Phosphor "light"), stroke 1.5px. **Cero emojis.**
- **Motion:** entradas con *ease-out* / spring, 180–240 ms; salidas más rápidas; respeta `prefers-reduced-motion`. Estados de carga con *skeleton* tipo shimmer, no spinners eternos.

---

## 4. Mapa de pantallas (todo lo que Stitch debe diseñar)

### 4.1 Barra superior (global)
- Izquierda: **marca "El Notebook Legal"** (logo = balanza/sello fino) — funciona como botón de Inicio. Bajo el nombre, microetiqueta en versalitas "INTELIGENCIA JURÍDICA · MÉXICO".
- En el workspace, junto a la marca: **chip del caso activo** (icono de rama + nombre del expediente + rama en versalitas).
- Derecha: botón **"Nuevo caso"**, toggle de tema (claro/oscuro), engranaje de **Configuración**.

### 4.2 Pantalla **Inicio / Dashboard**
- **Héroe asimétrico** (2 columnas): a la izquierda saludo editorial — fecha en versalitas (ej. "SÁBADO, 13 DE JUNIO"), titular grande en serif **"Bienvenido de vuelta"**, subtítulo, y un enlace sutil "o crear un expediente manualmente".
- A la derecha, **la pieza estrella: zona de carga inteligente** con borde punteado refinado: *"Arrastra el expediente del cliente"* + *"PDF, Word o imagen. La IA crea el caso, detecta la rama y carga el documento."* + chip "Analizar con IA". (Esta zona debe verse premium y ser el foco.)
- **Fila de métricas (4 tarjetas):** "Expedientes activos" (4), "Plazos por vigilar" (3, en rojo oxblood), "Ramas del derecho" (9), "Dataset actualizado" (fecha). Números en tabular, etiqueta en versalitas.
- **"Mis expedientes":** grid de tarjetas de caso. Cada tarjeta: icono de rama, etiqueta de rama (versalitas), **nombre del caso en serif**, "última actividad", y un **badge de plazo** (rojo si urgente, ej. "Prescripción 2 meses · art. 518"). Hover: leve elevación.
- **"Iniciar por rama":** fila de 9 chips (icono + nombre) para arrancar un caso por rama.

### 4.3 **Workspace** — una sola pantalla, **tres paneles**
> Proporciones: **Panel 1 ≈ 20% · Panel 2 ≈ 50% · Panel 3 ≈ 30%.** Separados por hairlines verticales.

**PANEL 1 — Archivero Legal (izquierda):**
- Encabezado "Archivero Legal · Expediente y marco normativo".
- *Sección Expediente:* zona de arrastre ("Arrastra un documento · la IA lo analiza y extrae sus datos"), input "Añadir hecho o palabra clave…", y **lista de archivos** (icono por tipo; mientras analiza muestra spinner + "Analizando con IA…"; al terminar "PDF · EXPEDIENTE").
- *Sección Filtro de Leyes:* tarjeta de **"Rama activa"** (icono + nombre) y lista de leyes con **interruptores (toggles)** para activar/desactivar (ej. Mercantil → "Cód. Comercio", "LGTOC").
- **Overlay "Visor de Artículo"** (aparece sobre este panel al hacer clic en una píldora de cita): botón "Volver", badge verde **"Texto literal verificado"**, encabezado "CÓD. COMERCIO · ARTÍCULO 1391" en versalitas, título del artículo en serif, **texto literal en serif sobre superficie de papel**, línea de fuente ("DOF · texto vigente"), botón "Copiar". *(Trátalo como un documento auténtico — pieza memorable.)*

**PANEL 2 — Despacho Central / Editor (centro):**
- Encabezado: "Despacho Central" + nombre del caso; a la derecha **control segmentado "Editor | Línea del Tiempo"**.
- *Barra de herramientas:* formato (negrita, cursiva, subrayado, encabezado, cita, lista viñetas, lista numerada, deshacer, rehacer) a la izquierda; a la derecha botón **"Generar ▾"** (menú: Demanda, Contestación de demanda, Alegatos, Demanda de amparo) y botón **"Exportar"**.
- *Superficie del editor:* una **"hoja" de documento centrada** (papel marfil, sombra suave, márgenes amplios) con tipografía serif de lectura. Placeholder editorial.
- *Vista Línea del Tiempo:* **cronología vertical** con puntos de color por severidad — "Hecho" (azul), "Contradicción" (ámbar), "Plazo" (rojo). Cada evento: fecha (tabular), etiqueta de tipo, título, detalle. Estado vacío con CTA "Generar línea del tiempo".

**PANEL 3 — Asistente de IA (derecha):**
- Encabezado "Asistente de IA · Fundamentación estricta · cero alucinaciones".
- **Tabs: "Guías Rápidas | Consulta".**
- *Guías Rápidas:* tarjeta de contexto de la rama + **checklist de preguntas críticas** del caso (ej. Laboral: "¿La demanda se presentó dentro de los 2 meses que marca el art. 518 LFT?"). Cada pregunta es clicable.
- *Consulta (chat):* burbujas (usuario a la derecha en acento, asistente a la izquierda en superficie), indicador de "escribiendo" con puntos, y al final de cada respuesta del asistente el **bloque "Sustento Legal y Fuentes"** con **píldoras de cita clicables** (ej. `CPEUM - Art. 16`, `Cód. Comercio - Art. 1391`). Campo de entrada con "Consulta el caso… (Enter para enviar)" y nota inferior "Modo … · respuestas con fundamentación estricta · Temp 0.0".

### 4.4 Modales (fondo con desenfoque, tarjeta centrada, animación de entrada)
1. **Nuevo expediente:** input "Nombre / número del expediente" + **grid de 9 ramas** seleccionables (icono + nombre + tagline). Botón "Crear expediente".
2. **Análisis de expediente (Intake) — 2 fases:**
   - *Analizando:* nombre del archivo + **checklist animado**: "Leyendo documento → Extrayendo datos generales → Detectando rama del derecho → Preparando expediente".
   - *Revisión "Expediente detectado":* banner **"Rama detectada: [Laboral]" + % de confianza** (badge verde); nombre editable; tarjetas con **Asunto, Partes (actor/demandado), Fechas clave, Leyes sugeridas, Resumen**; grid para corregir la rama; fuente del documento. Botones "Cancelar" / "Crear expediente".
3. **Exportación y Firma:** a la izquierda **previsualización de impresión** con **márgenes judiciales** (margen izquierdo amplio para costura, tamaño carta); a la derecha **módulo de firma**: input "Nombre del firmante" + **lienzo de firma autógrafa** (con línea punteada de firma) + nota "e.firma (a futuro)". Pie: "Exportar a Word" / "Exportar a PDF".
4. **Configuración Avanzada:** secciones — (A) **Control del modelo de IA**: dos tarjetas "Rápido" / "Razonamiento profundo" + **"Gobernanza de temperatura: 0.0"** bloqueada con candado; (B) **Gestor del dataset jurídico**: estado "Base de datos activa", "X preceptos indexados", fecha de actualización, y zona para **arrastrar Gacetas/DOF**; (C) **Privacidad y secreto profesional**: toggle **"Modo Sesión Segura"** (borrado automático al cerrar).

### 4.5 Responsive (tablet / móvil)
La misma calidad. En pantallas < 1024px, un panel a la vez con **barra de navegación inferior** de 3 ítems: **Archivero · Despacho · Asistente** (icono + etiqueta; el activo en acento). El Dashboard apila el héroe y las métricas en 2 columnas.

---

## 5. Tono de la microcopia (en español, real, NO lorem ipsum)
Profesional, claro, sin tecnicismos de software. Ejemplos: "Bienvenido de vuelta", "Arrastra el expediente del cliente", "Texto literal verificado", "Sustento Legal y Fuentes", "Fundamentación estricta · cero alucinaciones", "Plazos por vigilar".

---

## 6. PROMPTS LISTOS PARA PEGAR EN STITCH (en inglés; etiquetas visibles en español)

### 6.1 Prompt de Tema / Estilo (pégalo primero)
```
Design system for a premium legal-tech web app called "El Notebook Legal" for Mexican
lawyers. Mood: expensive, editorial, restrained — a "digital legal atelier", NOT a generic
AI/SaaS template. AVOID: bright SaaS blue, purple-pink gradients, identical rounded cards,
emoji icons, 3D blobs, decorative glassmorphism, centered hero with one huge button.

Light mode by default (never pure black, never gold). Warm near-monochrome palette:
canvas warm bone #F4F2EC, surfaces #FFFFFF / ivory #FBFAF7, reading surface warm paper
#FBF9F4, ink text #1C1B19, muted #6B6862, hairline borders #E6E3DC, single deep accent
navy-ink #1E3A5F, success deep green #2F6B4F, danger oxblood #9B2C2C, warning burnt amber
#9A6B1F. Optional dark mode as a refined pair.

Typography: editorial serif with character for headings and legal reading (Fraunces, or
Spectral/Newsreader); refined grotesque for UI (Hanken Grotesk or Geist). Strong type-scale
contrast. SMALL-CAPS labels with letter-spacing. Tabular figures for dates/amounts.

Details that signal "expensive": 1px hairline borders as the main separator, generous
whitespace, soft realistic two-level shadows, subtle paper texture only on reading surfaces,
asymmetric left-aligned editorial layout, thin consistent line icons (1.5px stroke, no
emoji), spring micro-interactions 180–240ms. All visible copy in Mexican Spanish.
```

### 6.2 Prompts por pantalla
**Inicio / Dashboard**
```
Design the "Inicio" (dashboard) screen, desktop. Top bar: brand "El Notebook Legal" on the
left (fine scales/seal logo, with small-caps subtitle "INTELIGENCIA JURÍDICA · MÉXICO"),
right side has "Nuevo caso" button, theme toggle, settings gear. Asymmetric hero (2 columns):
left = small-caps date "SÁBADO, 13 DE JUNIO", large serif headline "Bienvenido de vuelta",
subtitle, subtle link "o crear un expediente manualmente"; right = the STAR element, a refined
dashed AI intake dropzone "Arrastra el expediente del cliente / PDF, Word o imagen. La IA crea
el caso, detecta la rama y carga el documento" with an "Analizar con IA" chip. Below: 4 metric
cards (small-caps labels, tabular numbers): "Expedientes activos" 4, "Plazos por vigilar" 3
(oxblood), "Ramas del derecho" 9, "Dataset actualizado". Then "Mis expedientes": grid of case
cards (rama icon, small-caps rama tag, serif case name, "última actividad", red deadline badge
like "Prescripción 2 meses · art. 518"). Then "Iniciar por rama": row of 9 chips. Use the
established theme; expensive and calm, lots of whitespace.
```

**Workspace de 3 paneles**
```
Design the main workspace, one screen, three vertical panels separated by 1px hairlines:
LEFT ~20% "Archivero Legal": file intake dropzone, "Añadir hecho o palabra clave" input, file
list with type icons (one item showing a spinner + "Analizando con IA…"), then "Filtro de
Leyes" with an active-rama card and law toggle switches (Cód. Comercio, LGTOC).
CENTER ~50% "Despacho Central": header with case name and a segmented control "Editor | Línea
del Tiempo"; a formatting toolbar plus "Generar ▾" and "Exportar"; a centered document "sheet"
on warm paper with serif reading type and wide margins.
RIGHT ~30% "Asistente de IA" with subtitle "Fundamentación estricta · cero alucinaciones":
tabs "Guías Rápidas | Consulta"; chat with user bubbles (accent) and assistant bubbles
(surface), and at the end of an assistant answer a "Sustento Legal y Fuentes" block with
clickable citation pills "CPEUM - Art. 16", "Cód. Comercio - Art. 1391"; input "Consulta el
caso… (Enter para enviar)". Expensive, editorial, calm. Spanish copy.
```

**Visor de Artículo (overlay del Panel 1)**
```
Design the "Visor de Artículo" overlay that slides over the left panel: "Volver" back button,
a green verified badge "Texto literal verificado", small-caps header "CÓD. COMERCIO · ARTÍCULO
1391", a serif article title, and the literal legal text set in a refined serif on a warm
paper surface (subtle paper texture), a source line "DOF · texto vigente · corpus federal",
and a "Copiar" button. Make it feel like an authentic legal document — this is the signature
piece. Spanish copy.
```

**Modal de Análisis de expediente (Intake)**
```
Design the AI intake modal (blurred backdrop, centered card). Two states side by side:
(1) "Analizando expediente": file name + animated checklist "Leyendo documento → Extrayendo
datos generales → Detectando rama del derecho → Preparando expediente".
(2) "Expediente detectado": a banner "Rama detectada: Laboral" with a "92% confianza" green
badge; editable case name; data cards for "Asunto", "Partes" (actor/demandado), "Fechas
clave", "Leyes sugeridas", and a "Resumen"; a small grid to override the rama; footer buttons
"Cancelar" and "Crear expediente". Expensive, precise, trustworthy. Spanish copy.
```

**Modal de Exportación y Firma**
```
Design the "Exportación y Firma" modal: left = print preview of a legal document with strict
judicial margins (wide left binding margin, letter size, serif body); right = signature module
with "Nombre del firmante" input and a handwriting signature canvas (dashed signature line),
plus a note "e.firma (a futuro)". Footer: "Exportar a Word" and "Exportar a PDF" buttons.
Spanish copy, premium and formal.
```

**Modal de Configuración Avanzada**
```
Design the "Configuración Avanzada" modal with three sections: (A) "Control del modelo de IA"
— two selectable cards "Rápido" and "Razonamiento profundo", plus a locked row "Gobernanza de
temperatura: 0.0" with a padlock; (B) "Gestor del dataset jurídico" — status "Base de datos
activa", "preceptos indexados", last-updated date, and a dashed dropzone to upload "Gacetas /
DOF"; (C) "Privacidad y secreto profesional" — a toggle "Modo Sesión Segura" with explanation.
Expensive, calm, Spanish copy.
```

**Móvil**
```
Design the mobile (375px) version of the dashboard and the workspace. One panel at a time with
a bottom navigation bar of three items: "Archivero", "Despacho", "Asistente" (line icon +
label, active item in accent). Stack the hero and metrics. Keep the same premium, editorial,
warm look. Spanish copy.
```

---

## 7. Checklist para validar el resultado de Stitch
- [ ] ¿Se ve **caro y editorial**, o todavía genérico? (revisar sección 2)
- [ ] Tipografía con carácter (serif editorial + grotesca refinada), no Inter por defecto.
- [ ] Paleta cálida casi monocromática + 1 acento sobrio. Sin morado/rosa, sin dorado, sin negro puro.
- [ ] Hairlines 1px y mucho aire; sombras suaves, no pesadas.
- [ ] Iconos lineales finos, **cero emojis**.
- [ ] Las píldoras de fundamento y el visor de artículo se sienten como un "sello" distintivo.
- [ ] Todos los textos en español, reales (sin lorem ipsum).
- [ ] Tres paneles 20/50/30 con jerarquía clara.
