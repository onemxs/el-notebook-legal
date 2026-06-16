import { useEffect, useState, type ReactNode } from "react";
import {
  ScanText,
  Check,
  Loader2,
  Sparkles,
  FileText,
  Users,
  CalendarClock,
  ScrollText,
  ArrowRight,
  CircleCheck,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/lib/workspace";
import { analyzeExpediente, INTAKE_STEPS } from "@/lib/intake";
import { analyzeDocument } from "@/lib/claude";
import { BRANCH_LIST, BRANCHES } from "@/lib/branches";
import { BranchIcon } from "@/components/branchIcons";
import { kindFromName } from "@/lib/files";
import type { BranchId, CaseFile, ExtractedCase } from "@/lib/types";

let fid = 0;

function Analyzing({ fileName, current }: { fileName: string; current: number }) {
  return (
    <div className="py-2">
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-hairline bg-canvas/50 p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <FileText size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{fileName}</p>
          <p className="text-xs text-ink-subtle">Procesando con IA · temperatura 0.0</p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {INTAKE_STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                  done
                    ? "bg-success/15 text-success"
                    : active
                      ? "bg-accent-soft text-accent"
                      : "bg-elevated text-ink-subtle"
                }`}
              >
                {done ? (
                  <Check size={15} />
                ) : active ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={`text-sm ${
                  active ? "font-medium text-ink" : done ? "text-ink-muted" : "text-ink-subtle"
                }`}
              >
                {step}
                {active ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline bg-panel-solid p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Review({
  data,
  fileName,
  caseName,
  setCaseName,
  selected,
  setSelected,
}: {
  data: ExtractedCase;
  fileName: string;
  caseName: string;
  setCaseName: (v: string) => void;
  selected: BranchId;
  setSelected: (b: BranchId) => void;
}) {
  const pct = Math.round(data.confidence * 100);
  return (
    <div className="animate-fade-in">
      {/* Detected branch banner */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <BranchIcon id={data.branch} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">
            Rama detectada
          </p>
          <p className="text-sm font-semibold text-ink">{BRANCHES[data.branch].name}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
          <CircleCheck size={13} />
          {pct}% confianza
        </span>
      </div>

      {/* Editable case name */}
      <label className="mb-1.5 block text-xs font-medium text-ink-muted" htmlFor="intakeName">
        Nombre del expediente
      </label>
      <input
        id="intakeName"
        value={caseName}
        onChange={(e) => setCaseName(e.target.value)}
        className="mb-4 w-full rounded-xl border border-hairline bg-panel-solid px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
      />

      {/* Extracted data */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field icon={<FileText size={12} />} label="Asunto">
          <p className="text-[13px] text-ink">{data.asunto}</p>
        </Field>
        <Field icon={<ScrollText size={12} />} label="Leyes sugeridas">
          <div className="flex flex-wrap gap-1">
            {data.suggestedLaws.map((l) => (
              <span
                key={l}
                className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent"
              >
                {l}
              </span>
            ))}
          </div>
        </Field>
        <Field icon={<Users size={12} />} label="Partes">
          <ul className="space-y-1">
            {data.parties.map((p) => (
              <li key={p.label} className="text-[12px]">
                <span className="text-ink-subtle">{p.label}: </span>
                <span className="font-medium text-ink">{p.value}</span>
              </li>
            ))}
          </ul>
        </Field>
        <Field icon={<CalendarClock size={12} />} label="Fechas clave">
          <ul className="space-y-1">
            {data.keyDates.map((d) => (
              <li key={d.label} className="text-[12px]">
                <span className="text-ink-subtle">{d.label}: </span>
                <span className="font-medium text-ink">{d.value}</span>
              </li>
            ))}
          </ul>
        </Field>
      </div>

      <div className="mt-2.5 rounded-xl border border-hairline bg-canvas/50 p-3">
        <p className="text-[13px] leading-relaxed text-ink-muted">{data.summary}</p>
      </div>

      {/* Branch override */}
      <p className="mb-2 mt-4 text-xs font-medium text-ink-muted">
        ¿La rama no es correcta? Ajústala:
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {BRANCH_LIST.map((b) => {
          const active = selected === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-all cursor-pointer ${
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-hairline text-ink-muted hover:border-accent/40"
              }`}
            >
              <BranchIcon id={b.id} size={13} />
              <span className="truncate text-[11px] font-medium">{b.name}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 truncate text-[11px] text-ink-subtle">Fuente: {fileName}</p>
    </div>
  );
}

export function IntakeModal() {
  const { intakeFile, clearIntake, startCase, addFiles, seedFromExtraction } = useWorkspace();
  const [current, setCurrent] = useState(0);
  const [data, setData] = useState<ExtractedCase | null>(null);
  const [caseName, setCaseName] = useState("");
  const [selected, setSelected] = useState<BranchId>("civil");
  const fileName = intakeFile?.name ?? "";

  useEffect(() => {
    if (!intakeFile) return;
    let cancelled = false;
    setData(null);
    setCurrent(0);
    // Animate the step checklist while the (single) request runs.
    let step = 0;
    const timer = setInterval(() => {
      step = Math.min(step + 1, INTAKE_STEPS.length - 1);
      if (!cancelled) setCurrent(step);
    }, 850);
    void (async () => {
      // Real analysis with Claude when configured; demo responder otherwise.
      const res = (await analyzeDocument(intakeFile)) ?? (await analyzeExpediente(intakeFile.name));
      if (cancelled) return;
      clearInterval(timer);
      setData(res);
      setSelected(res.branch);
      setCaseName(res.caseName);
    })();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intakeFile]);

  const confirm = () => {
    if (!intakeFile || !data) return;
    startCase(selected, caseName);
    const file: CaseFile = {
      id: `f-intake-${(fid++).toString(36)}`,
      name: intakeFile.name,
      kind: kindFromName(intakeFile.name),
      size: "expediente",
      addedAt: Date.now(),
    };
    addFiles([file]);
    // Reuse the analysis we already have to build the timeline immediately.
    seedFromExtraction(intakeFile.name, data);
    clearIntake();
  };

  return (
    <Modal
      open={!!intakeFile}
      onClose={clearIntake}
      title={data ? "Expediente detectado" : "Analizando expediente"}
      subtitle={
        data
          ? "Revisa y confirma los datos extraídos por la IA"
          : "La IA está leyendo y clasificando el documento"
      }
      icon={data ? <Sparkles size={18} /> : <ScanText size={18} />}
      size="lg"
      footer={
        data ? (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={clearIntake}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={confirm}
              disabled={!caseName.trim()}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-40 enabled:cursor-pointer"
            >
              Crear expediente
              <ArrowRight size={16} />
            </button>
          </div>
        ) : undefined
      }
    >
      {intakeFile &&
        (data ? (
          <Review
            data={data}
            fileName={fileName}
            caseName={caseName}
            setCaseName={setCaseName}
            selected={selected}
            setSelected={setSelected}
          />
        ) : (
          <Analyzing fileName={fileName} current={current} />
        ))}
    </Modal>
  );
}
