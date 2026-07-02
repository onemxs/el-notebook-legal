import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.liquid-glass-move');
      const mouseX = (e.clientX / window.innerWidth) - 0.5;
      const mouseY = (e.clientY / window.innerHeight) - 0.5;

      cards.forEach((card, index) => {
        const speed = (index + 1) * 15;
        const x = mouseX * speed;
        const y = mouseY * speed;
        (card as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="font-sans antialiased text-[#1a1c1e] bg-[#F9F9F6] min-h-screen selection:bg-primary/20 selection:text-primary">
      <style>{`
        .liquid-glass {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.45);
          box-shadow: 0 10px 30px -10px rgba(2, 36, 72, 0.04);
        }
        .glint-effect { position: relative; overflow: hidden; }
        .glint-effect::after {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: linear-gradient(45deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.15) 55%, rgba(255,255,255,0) 100%);
          transform: rotate(45deg); animation: glint-anim 4.5s infinite;
        }
        @keyframes glint-anim {
          0% { transform: translateX(-150%) rotate(45deg); }
          25% { transform: translateX(150%) rotate(45deg); }
          100% { transform: translateX(150%) rotate(45deg); }
        }
      `}</style>

      {/* NAV BAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/30 backdrop-blur-xl border-white/40 shadow-sm">
        <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-[1200px] mx-auto">
          <div className="font-serif text-2xl font-semibold tracking-wide text-[#022448]">PasantIA</div>
          <button
            onClick={onLogin}
            className="bg-[#022448] text-white px-5 py-2 rounded-full font-medium text-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            Acceso con Google
          </button>
        </div>
      </nav>

      {/* HERO */}
      <main className="pt-28 md:pt-36 pb-16">
        <section className="max-w-[1200px] mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center min-h-[600px]">
          <div className="space-y-6">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#022448] leading-tight font-medium">
              Tu despacho legal, potenciado por{' '}
              <span className="italic font-normal">IA procesal verídica.</span>
            </h1>
            <p className="text-lg text-[#526070] max-w-lg leading-relaxed">
              Análisis profundo de expedientes y redacción fundada sin plantillas vacías. PasantIA
              transforma la litigación compleja en estrategia pura.
            </p>
            <div className="pt-2">
              <button
                onClick={onLogin}
                className="glint-effect bg-[#022448] text-white px-8 py-4 rounded-full font-semibold text-base hover:opacity-95 active:scale-95 transition-all flex items-center gap-3 cursor-pointer shadow-md w-full md:w-auto justify-center"
              >
                Iniciar en el Despacho
              </button>
            </div>
          </div>

          {/* MOCKUP INTERFAZ PREMIUM GENERADO POR STITCH */}
          <div className="relative flex justify-center mt-6 md:mt-0">
            {/* Capa trasera decorativa de fondo con rotación jurídica */}
            <div className="absolute -left-12 top-12 w-full h-full liquid-glass rounded-xl p-8 shadow-xl opacity-40 transform -rotate-3 pointer-events-none hidden md:block">
              <div className="space-y-4">
                <div className="h-4 w-3/4 bg-[#022448]/20 rounded"></div>
                <div className="h-4 w-1/2 bg-[#022448]/20 rounded"></div>
                <div className="pt-8 space-y-2">
                  <div className="h-2 w-full bg-gray-400/10 rounded"></div>
                  <div className="h-2 w-full bg-gray-400/10 rounded"></div>
                  <div className="h-2 w-5/6 bg-gray-400/10 rounded"></div>
                </div>
                <div className="mt-12 border-t border-[#022448]/10 pt-4">
                  <span className="font-serif text-[#022448]/40 text-lg">Recurso de Apelación</span>
                </div>
              </div>
            </div>

            {/* CONTENEDOR PRINCIPAL CON NUESTRA IMAGEN REAL LOCAL */}
            <div className="liquid-glass rounded-2xl overflow-hidden w-full max-w-lg aspect-[4/3] relative z-10 shadow-xl border border-white/50 group">
              <img 
                src="/images/hero.png" 
                alt="Abogados utilizando PasantIA" 
                className="absolute inset-0 w-full h-full object-cover mix-blend-normal opacity-95 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#022448]/40 via-transparent to-white/10 backdrop-blur-[2px]"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-left">
                <p className="text-xs font-sans text-white/80 tracking-wide">
                  Inteligencia procesal integrada en el flujo diario de tu firma.
                </p>
              </div>
            </div>

            {/* Tarjeta flotante interactiva superior: Estado 100% */}
            <div className="liquid-glass-move absolute -top-6 -right-6 liquid-glass p-4 rounded-xl shadow-xl z-20 flex items-center gap-3 transition-transform duration-300 ease-out">
              <div className="bg-green-100 text-green-700 p-1 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Estado</span>
                <span className="text-sm font-semibold text-[#022448]">Hechos analizados: 100%</span>
              </div>
            </div>

            {/* Tarjeta flotante interactiva inferior: Articulado Vectorial */}
            <div className="liquid-glass-move absolute -bottom-4 -left-8 liquid-glass p-4 rounded-xl shadow-xl z-20 flex items-center gap-3 transition-transform duration-300 ease-out">
              <div className="bg-[#022448]/10 text-[#022448] p-2 rounded-lg text-lg">
                ⚖️
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vector RAG</span>
                <span className="text-sm font-semibold text-[#022448]">Fundamento: Art. 251 CNPP</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6 FEATURE CARDS */}
        <section id="features" className="max-w-[1200px] mx-auto px-6 md:px-12 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="liquid-glass p-8 rounded-2xl group hover:border-[#022448]/30 transition-all duration-300 text-left">
              <div className="w-12 h-12 rounded-full bg-[#022448]/10 flex items-center justify-center mb-5 text-xl">📁</div>
              <h3 className="font-serif text-xl font-medium text-[#022448] mb-3">El Archivero</h3>
              <p className="text-sm text-[#526070] leading-relaxed">
                Ingestión masiva de expedientes. Extracción quirúrgica de hechos, partes procesales y
                elementos clave desde documentos PDF y Word.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-2xl group hover:border-[#022448]/30 transition-all duration-300 text-left">
              <div className="w-12 h-12 rounded-full bg-[#022448]/10 flex items-center justify-center mb-5 text-xl">⏳</div>
              <h3 className="font-serif text-xl font-medium text-[#022448] mb-3">La Línea del Tiempo</h3>
              <p className="text-sm text-[#526070] leading-relaxed">
                Cronología dinámica automatizada. Visualice cada hito procesal y reciba alertas
                inteligentes sobre plazos de prescripción y caducidad.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-2xl group hover:border-[#022448]/30 transition-all duration-300 text-left">
              <div className="w-12 h-12 rounded-full bg-[#022448]/10 flex items-center justify-center mb-5 text-xl">🔍</div>
              <h3 className="font-serif text-xl font-medium text-[#022448] mb-3">El Motor RAG</h3>
              <p className="text-sm text-[#526070] leading-relaxed">
                Redacción de alta escuela. Generación de clausulado complejo utilizando recuperación de
                vectores para inyectar artículos legales precisos y vigentes.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-2xl group hover:border-[#022448]/30 transition-all duration-300 text-left">
              <div className="w-12 h-12 rounded-full bg-[#022448]/10 flex items-center justify-center mb-5 text-xl">🎙️</div>
              <h3 className="font-serif text-xl font-medium text-[#022448] mb-3">Audiencias a Texto Local</h3>
              <p className="text-sm text-[#526070] leading-relaxed">
                Procesamiento local de videos de audiencias (MP4, MKV). El sistema transcribe el audio
                automáticamente para indexarlo al caso de forma segura.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-2xl group hover:border-[#022448]/30 transition-all duration-300 text-left">
              <div className="w-12 h-12 rounded-full bg-[#022448]/10 flex items-center justify-center mb-5 text-xl">📄</div>
              <h3 className="font-serif text-xl font-medium text-[#022448] mb-3">Generación Predictiva</h3>
              <p className="text-sm text-[#526070] leading-relaxed">
                Redacción automatizada de demandas, recursos de amparo y apelaciones analizando el
                expediente entero en un clic. Cero machotes vacíos.
              </p>
            </div>

            <div className="liquid-glass p-8 rounded-2xl group hover:border-[#022448]/30 transition-all duration-300 text-left">
              <div className="w-12 h-12 rounded-full bg-[#022448]/10 flex items-center justify-center mb-5 text-xl">💬</div>
              <h3 className="font-serif text-xl font-medium text-[#022448] mb-3">Exportación Omnicanal</h3>
              <p className="text-sm text-[#526070] leading-relaxed">
                Termina tus escritos jurídicos en nuestro editor premium y despáchalos al instante
                enviándolos a tus clientes vía WhatsApp o email.
              </p>
            </div>
          </div>
        </section>

        {/* SESIÓN SEGURA */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-4">
          <div className="liquid-glass px-6 py-4 rounded-full flex flex-col md:flex-row items-center justify-center gap-4 border-dashed">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#022448] uppercase">
              🛡️ SESIÓN SEGURA ACTIVA
            </div>
            <p className="text-xs text-[#526070] text-center md:text-left">
              Protección del secreto profesional. Los expedientes se procesan con encriptación de
              grado bancario y aislamiento absoluto.
            </p>
          </div>
        </section>

        {/* DISCLAIMER — HERRAMIENTA, NO SUSTITUTO */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-12 py-6">
          <div className="rounded-2xl border border-[#022448]/20 bg-gradient-to-r from-[#022448]/5 to-[#022448]/[0.02] px-6 py-5 md:px-8 md:py-6">
            <p className="text-sm leading-relaxed text-[#022448]">
              <span className="font-semibold">PasantIA es tu asistente en litigación.</span> Analizamos expedientes, redactamos escritos, buscamos en el corpus legal. Pero <span className="font-semibold">tú tomas las decisiones</span> — la estrategia, los criterios finales y la responsabilidad jurídica siempre son tuyas. Somos una herramienta potente, no un sustituto del abogado.
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-200/60 bg-white/40 py-8 text-xs text-[#526070]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>© 2026 PasantIA. Herramientas de litigación premium.</div>
          <div className="flex gap-6">
            <Link to="/privacidad" className="transition-colors hover:text-[#022448]">
              Aviso de Privacidad
            </Link>
            <Link to="/terminos" className="transition-colors hover:text-[#022448]">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
