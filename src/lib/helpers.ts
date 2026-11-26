export const AVATAR_COLOR_OPTIONS = ["indigo", "emerald", "amber", "rose", "sky"] as const;

export const AVATAR_COLOR_CLASSES: Record<string, string> = {
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
};

export function getAvatarClass(color?: string | null): string {
  if (color && AVATAR_COLOR_CLASSES[color]) {
    return AVATAR_COLOR_CLASSES[color];
  }
  return AVATAR_COLOR_CLASSES.indigo;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** Generate a readable, unambiguous 5-character group invite code prefixed with KLP-. */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KLP-${code}`;
}

export type DeadlineLevel = "green" | "yellow" | "red" | "done";

export interface DeadlineMeta {
  label: string;
  level: DeadlineLevel;
  isUrgent: boolean;
}

/** Format a deadline date into student-friendly wording and color level. */
export function getDeadlineMeta(dueDateInput: string | Date, isDone: boolean): DeadlineMeta {
  if (isDone) {
    return { label: "Selesai", level: "done", isUrgent: false };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dueDateInput);
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Telat ${Math.abs(diffDays)} hari`, level: "red", isUrgent: true };
  }
  if (diffDays === 0) {
    return { label: "Hari ini", level: "red", isUrgent: true };
  }
  if (diffDays === 1) {
    return { label: "Besok", level: "yellow", isUrgent: true };
  }
  return { label: `${diffDays} hari lagi`, level: "green", isUrgent: false };
}

export function getDeadlineBadgeClass(level: DeadlineLevel): string {
  switch (level) {
    case "done":
      return "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30";
    case "red":
      return "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30";
    case "yellow":
      return "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30";
    default:
      return "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25";
  }
}

export function dateFromPresetOrIso(value: string): Date {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);
  if (value === "today") return base;
  if (value === "tomorrow") {
    base.setDate(base.getDate() + 1);
    return base;
  }
  if (value === "3days") {
    base.setDate(base.getDate() + 3);
    return base;
  }
  if (value === "5days") {
    base.setDate(base.getDate() + 5);
    return base;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? base : parsed;
}
