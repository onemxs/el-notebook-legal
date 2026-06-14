interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Toggle({ checked, onChange, label, disabled, size = "md" }: ToggleProps) {
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "h-[14px] w-[14px]" : "h-[18px] w-[18px]";
  const travel = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex ${track} shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-accent" : "bg-ink-subtle/35"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`pointer-events-none ml-0.5 inline-block ${knob} transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft ${
          checked ? travel : "translate-x-0"
        }`}
      />
    </button>
  );
}
