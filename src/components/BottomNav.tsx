import { CalendarDays, Home, Pill, Plus, UserRound, type LucideIcon } from "lucide-react";
import type { AppPage } from "../app/routes";

interface BottomNavProps {
  active: AppPage;
  onNavigate: (page: AppPage) => void;
  onAdd: () => void;
}

const navItems: Array<{ page: AppPage; label: string; icon: LucideIcon }> = [
  { page: "today", label: "Сегодня", icon: Home },
  { page: "medications", label: "Лекарства", icon: Pill },
  { page: "calendar", label: "Календарь", icon: CalendarDays },
  { page: "stats", label: "Профиль", icon: UserRound }
];

export default function BottomNav({ active, onNavigate, onAdd }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-black/5 bg-white/95 px-4 pb-[calc(0.7rem+var(--safe-bottom))] pt-2 shadow-[0_-10px_30px_rgba(16,35,28,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#101916]/95">
      <div className="grid grid-cols-5 items-center gap-1">
        {navItems.slice(0, 2).map((item) => (
          <NavButton key={item.page} item={item} active={active === item.page} onClick={() => onNavigate(item.page)} />
        ))}
        <button
          onClick={onAdd}
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-app-green text-white shadow-lg shadow-emerald-500/30"
          aria-label="Добавить лекарство"
        >
          <Plus size={30} strokeWidth={2.8} />
        </button>
        {navItems.slice(2).map((item) => (
          <NavButton key={item.page} item={item} active={active === item.page} onClick={() => onNavigate(item.page)} />
        ))}
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-semibold ${
        active ? "text-app-green" : "text-app-muted dark:text-white/65"
      }`}
    >
      <Icon size={21} />
      <span className="truncate">{item.label}</span>
    </button>
  );
}
