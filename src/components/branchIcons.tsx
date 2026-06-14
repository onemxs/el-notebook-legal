import {
  Gavel,
  Vote,
  HardHat,
  Users,
  Store,
  Landmark,
  Receipt,
  ShieldCheck,
  BookMarked,
  type LucideIcon,
} from "lucide-react";
import type { BranchId } from "@/lib/types";

export const BRANCH_ICON: Record<BranchId, LucideIcon> = {
  penal: Gavel,
  electoral: Vote,
  laboral: HardHat,
  civil: Users,
  mercantil: Store,
  administrativo: Landmark,
  fiscal: Receipt,
  amparo: ShieldCheck,
  constitucional: BookMarked,
};

export function BranchIcon({ id, size = 18 }: { id: BranchId; size?: number }) {
  const Icon = BRANCH_ICON[id];
  return <Icon size={size} strokeWidth={1.75} />;
}
