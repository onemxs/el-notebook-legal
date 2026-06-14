import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
} from "lucide-react";

interface ToolbarProps {
  exec: (command: string, value?: string) => void;
}

const BTN =
  "flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer";

function Divider() {
  return <span className="mx-1 h-5 w-px bg-hairline" />;
}

export function EditorToolbar({ exec }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <button className={BTN} title="Negrita (Ctrl+B)" aria-label="Negrita" onClick={() => exec("bold")}>
        <Bold size={16} />
      </button>
      <button className={BTN} title="Cursiva (Ctrl+I)" aria-label="Cursiva" onClick={() => exec("italic")}>
        <Italic size={16} />
      </button>
      <button
        className={BTN}
        title="Subrayado (Ctrl+U)"
        aria-label="Subrayado"
        onClick={() => exec("underline")}
      >
        <Underline size={16} />
      </button>
      <Divider />
      <button
        className={BTN}
        title="Encabezado"
        aria-label="Encabezado"
        onClick={() => exec("formatBlock", "<h2>")}
      >
        <Heading2 size={16} />
      </button>
      <button
        className={BTN}
        title="Cita"
        aria-label="Cita"
        onClick={() => exec("formatBlock", "<blockquote>")}
      >
        <Quote size={16} />
      </button>
      <Divider />
      <button
        className={BTN}
        title="Lista con viñetas"
        aria-label="Lista con viñetas"
        onClick={() => exec("insertUnorderedList")}
      >
        <List size={16} />
      </button>
      <button
        className={BTN}
        title="Lista numerada"
        aria-label="Lista numerada"
        onClick={() => exec("insertOrderedList")}
      >
        <ListOrdered size={16} />
      </button>
      <Divider />
      <button className={BTN} title="Deshacer" aria-label="Deshacer" onClick={() => exec("undo")}>
        <Undo2 size={16} />
      </button>
      <button className={BTN} title="Rehacer" aria-label="Rehacer" onClick={() => exec("redo")}>
        <Redo2 size={16} />
      </button>
    </div>
  );
}
