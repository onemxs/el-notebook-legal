import { useEffect, useRef, useState } from "react";
import { Eraser, PenTool } from "lucide-react";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#1a202c";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (canvasRef.current) onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="sign-canvas block h-40 w-full"
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
            <PenTool size={22} strokeWidth={1.5} />
            <span className="text-xs">Firma aquí con el mouse, lápiz o tableta</span>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-6 right-6 border-b border-dashed border-slate-300" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-ink-subtle">Firma autógrafa digital</p>
        <button
          onClick={clear}
          disabled={!hasInk}
          className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-40 enabled:cursor-pointer"
        >
          <Eraser size={13} />
          Limpiar
        </button>
      </div>
    </div>
  );
}
