import { Link } from "react-router-dom";
import { ArrowLeft, Scale, ShieldCheck, FileText } from "lucide-react";

/**
 * Términos de Servicio y Aviso de Privacidad (LFPDPPP).
 * Documento base operativo — debe pasar por revisión de un abogado antes del
 * lanzamiento comercial. Última actualización: 2 de julio de 2026.
 */

const ACTUALIZADO = "2 de julio de 2026";
const CONTACTO = "omixtega@gmail.com";

function Shell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-hairline bg-panel-solid/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
            aria-label="Volver al inicio"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
            {icon}
          </span>
          <div>
            <h1 className="font-serif text-lg font-medium leading-tight">{title}</h1>
            <p className="text-[11px] text-ink-subtle">
              PasantIA · Última actualización: {ACTUALIZADO}
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">
        <article className="prose-legal space-y-5 text-[14px] leading-relaxed text-ink-muted [&_h2]:mt-7 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-ink [&_strong]:text-ink">
          {children}
        </article>
      </main>
      <footer className="mx-auto max-w-3xl px-5 pb-10 text-[12px] text-ink-subtle">
        <p>
          ¿Dudas sobre este documento? Escríbenos a <strong>{CONTACTO}</strong>.
        </p>
      </footer>
    </div>
  );
}

export function Terminos() {
  return (
    <Shell icon={<FileText size={17} />} title="Términos de Servicio">
      <p>
        Estos Términos regulan el uso de <strong>PasantIA</strong> (el “Servicio”), una plataforma
        de asistencia para profesionales del derecho en México. Al crear una cuenta o usar el
        Servicio aceptas estos Términos.
      </p>

      <h2>1. Naturaleza del Servicio — herramienta, no asesoría</h2>
      <p>
        PasantIA es una <strong>herramienta de auxilio profesional</strong>: analiza expedientes,
        sugiere redacción, organiza cronologías y consulta fuentes jurídicas indexadas.{" "}
        <strong>No presta asesoría legal, no ejerce la abogacía y no sustituye el criterio del
        abogado.</strong> Las decisiones, la estrategia jurídica, la verificación de fuentes y la
        responsabilidad profesional frente al cliente y las autoridades son siempre del usuario.
      </p>

      <h2>2. Contenido generado con inteligencia artificial</h2>
      <p>
        Los borradores, análisis y respuestas se generan con modelos de IA y{" "}
        <strong>pueden contener errores, omisiones o imprecisiones</strong>. El usuario debe
        revisar y validar todo contenido contra las fuentes oficiales antes de usarlo en cualquier
        actuación. Los indicadores de vigencia y los cálculos de plazos son apoyos conservadores de
        referencia, no dictámenes; verifica siempre la norma, la jurisprudencia y el cómputo
        aplicable a tu caso concreto.
      </p>

      <h2>3. Cuenta y seguridad</h2>
      <p>
        La cuenta es personal. Eres responsable de la confidencialidad de tus credenciales y del
        uso que se haga con ellas. En planes de despacho, quien administra la organización controla
        las invitaciones y el acceso de su equipo a los expedientes compartidos.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>
        Te comprometes a no usar el Servicio para fines ilícitos, a no intentar vulnerar su
        seguridad, a no revender el acceso y a contar con las autorizaciones necesarias (incluido
        el consentimiento de tus clientes cuando aplique) para subir documentos e información de
        terceros.
      </p>

      <h2>5. Confidencialidad y secreto profesional</h2>
      <p>
        Los expedientes que subes se tratan como información confidencial, se aíslan por cuenta y
        organización mediante controles de acceso a nivel de fila, y se procesan únicamente para
        prestarte el Servicio, conforme al{" "}
        <Link to="/privacidad" className="text-accent underline">
          Aviso de Privacidad
        </Link>
        .
      </p>

      <h2>6. Propiedad intelectual</h2>
      <p>
        Tus documentos y expedientes son tuyos. Los borradores generados a partir de tu información
        te pertenecen una vez entregados. La plataforma, su código, marca y diseño pertenecen a
        PasantIA.
      </p>

      <h2>7. Disponibilidad y límites de responsabilidad</h2>
      <p>
        El Servicio se presta “como está”, con esfuerzos razonables de disponibilidad y sin
        garantía de continuidad ininterrumpida. En la máxima medida permitida por la ley, la
        responsabilidad total de PasantIA se limita al monto pagado por el usuario en los tres
        meses previos al hecho que la origine. PasantIA no responde por resoluciones judiciales o
        administrativas adversas, plazos vencidos ni daños derivados de decisiones profesionales
        tomadas con apoyo de la herramienta.
      </p>

      <h2>8. Modificaciones y terminación</h2>
      <p>
        Podemos actualizar estos Términos y las funciones del Servicio; los cambios relevantes se
        notificarán dentro de la plataforma. Puedes cancelar tu cuenta en cualquier momento; al
        hacerlo podrás solicitar la eliminación de tus datos conforme al Aviso de Privacidad.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier
        controversia se someterá a los tribunales competentes de la Ciudad de México, salvo norma
        imperativa en contrario.
      </p>
    </Shell>
  );
}

export function Privacidad() {
  return (
    <Shell icon={<ShieldCheck size={17} />} title="Aviso de Privacidad">
      <p>
        En cumplimiento de la <strong>Ley Federal de Protección de Datos Personales en Posesión de
        los Particulares (LFPDPPP)</strong>, PasantIA, con correo de contacto {CONTACTO} (el
        “Responsable”), pone a tu disposición este Aviso de Privacidad.
      </p>

      <h2>1. Datos que tratamos</h2>
      <p>
        (a) <strong>Datos de cuenta</strong>: nombre, correo, cédula profesional y especialidad si
        decides capturarlas, y el identificador de tu proveedor de acceso (Google). (b){" "}
        <strong>Contenido profesional</strong>: expedientes, documentos, transcripciones y notas
        que subes voluntariamente, que pueden contener datos personales de terceros de los que tú
        eres responsable primario como abogado. (c) <strong>Datos de uso</strong>: registros
        técnicos necesarios para operar y proteger el Servicio (p. ej., contadores de uso de las
        funciones de IA).
      </p>

      <h2>2. Finalidades</h2>
      <p>
        Primarias: prestar el Servicio (análisis de expedientes, generación de borradores,
        cronologías, búsqueda jurídica), autenticación, soporte, seguridad y cumplimiento legal.
        Secundarias (opcionales): comunicaciones sobre novedades del producto — puedes oponerte
        escribiendo al correo de contacto.
      </p>

      <h2>3. Encargados y transferencias</h2>
      <p>
        Usamos proveedores que tratan datos por cuenta del Responsable: infraestructura y base de
        datos (Supabase), alojamiento (Vercel) y modelos de IA para el análisis y la redacción
        (Anthropic; OpenAI para vectores de búsqueda). Estos proveedores pueden ubicarse fuera de
        México (EE. UU.) y están sujetos a obligaciones de confidencialidad. La transcripción de
        audio y video se procesa <strong>localmente en tu navegador</strong>: esos archivos no se
        suben a nuestros servidores. No vendemos datos personales.
      </p>

      <h2>4. Conservación y seguridad</h2>
      <p>
        Los datos se conservan mientras tu cuenta esté activa y el tiempo necesario para
        obligaciones legales. Aplicamos cifrado en tránsito y en reposo, aislamiento por cuenta y
        organización (políticas de acceso a nivel de fila) y controles de acceso con sesión
        obligatoria para las funciones de IA.
      </p>

      <h2>5. Derechos ARCO</h2>
      <p>
        Puedes ejercer tus derechos de <strong>Acceso, Rectificación, Cancelación y Oposición</strong>,
        así como revocar tu consentimiento o solicitar la portabilidad/eliminación de tus
        expedientes, escribiendo a <strong>{CONTACTO}</strong> desde el correo de tu cuenta.
        Responderemos en los plazos que marca la LFPDPPP.
      </p>

      <h2>6. Cookies y almacenamiento local</h2>
      <p>
        Usamos almacenamiento del navegador estrictamente funcional (sesión, preferencia de tema,
        modo de exploración). No usamos rastreadores publicitarios.
      </p>

      <h2>7. Cambios a este aviso</h2>
      <p>
        Publicaremos aquí cualquier actualización y, si implica nuevos tratamientos relevantes, lo
        notificaremos dentro de la plataforma antes de aplicarla.
      </p>

      <p className="text-[12px] text-ink-subtle">
        Consulta también los{" "}
        <Link to="/terminos" className="text-accent underline">
          Términos de Servicio
        </Link>
        .
      </p>
    </Shell>
  );
}

export const LEGAL_ICON = Scale;
