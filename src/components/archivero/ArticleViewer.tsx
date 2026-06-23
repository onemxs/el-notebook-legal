import { ArrowLeft, BookOpen, ShieldCheck, AlertTriangle, Copy, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/workspace";
import { getArticle } from "@/lib/corpus";
import { SUPA_CONFIGURED, fetchArticulo } from "@/lib/supabase";
import type { Article } from "@/lib/types";

export function ArticleViewer() {
  const { activeArticle, closeArticle } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeArticle) {
      setArticle(null);
      return;
    }
    const local = getArticle(activeArticle.code, activeArticle.article) ?? null;
    setArticle(local); // show local instantly when available
    if (!SUPA_CONFIGURED) return;
    let cancelled = false;
    setLoading(true);
    fetchArticulo(activeArticle.code, activeArticle.article)
      .then((remote) => {
        if (!cancelled && remote) setArticle(remote); // upgrade to full official text
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeArticle]);

  if (!activeArticle) return null;

  const copy = () => {
    if (!article) return;
    navigator.clipboard?.writeText(`${article.code} Art. ${article.article}. ${article.text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col paper animate-slide-in-left">
      <header className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <button
          onClick={closeArticle}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
          {loading ? "Consultando…" : "Texto literal verificado"}
        </span>
      </header>

      <div className="scroll-zone flex-1 overflow-y-auto px-5 py-5">
        {article ? (
          <article className="animate-fade-in">
            <div className="mb-3 flex items-center gap-2 text-accent">
              <BookOpen size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {article.code} · Artículo {article.article}
              </span>
            </div>
            <h3 className="mb-1 font-serif text-2xl font-medium leading-snug text-ink">
              {article.heading || `Artículo ${article.article}`}
            </h3>
            <p className="mb-4 text-xs text-ink-subtle">{article.fullCode}</p>

            <div className="rounded-2xl border border-hairline bg-panel-solid p-4">
              <p className="prose-legal whitespace-pre-line text-ink">{article.text}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink-subtle">{article.source}</p>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
              >
                {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </article>
        ) : loading ? (
          <div className="space-y-3 animate-fade-in">
            <div className="h-4 w-1/3 rounded bg-elevated shimmer" />
            <div className="h-3 w-full rounded bg-elevated shimmer" />
            <div className="h-3 w-11/12 rounded bg-elevated shimmer" />
            <div className="h-3 w-4/5 rounded bg-elevated shimmer" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline px-4 py-10 text-center animate-fade-in">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle size={20} />
            </span>
            <p className="text-sm font-medium text-ink">
              {activeArticle.code} · Art. {activeArticle.article}
            </p>
            <p className="max-w-xs text-xs text-ink-muted">
              {SUPA_CONFIGURED
                ? "Este artículo no está en el corpus indexado. Ejecuta la ingesta o verifica el código."
                : "Este precepto aún no está en el corpus local. Conecta la Base de Datos Procesal e ingesta el corpus para el texto completo."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
