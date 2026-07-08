import { Bell, Menu } from "lucide-react";
import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBellClick?: () => void;
  action?: ReactNode;
}

export default function Header({ title, subtitle, onBellClick, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pb-4 pt-5">
      <button className="grid h-10 w-10 place-items-center rounded-full text-app-text hover:bg-black/5 dark:text-white dark:hover:bg-white/10">
        <Menu size={22} />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-xl font-extrabold tracking-normal text-app-text dark:text-white">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm font-medium text-app-green">{subtitle}</p> : null}
      </div>
      {action ?? (
        <button
          onClick={onBellClick}
          className="relative grid h-10 w-10 place-items-center rounded-full text-app-text hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
          aria-label="Уведомления"
        >
          <Bell size={22} />
          <span className="absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-app-green px-1 text-[10px] font-bold text-white">
            3
          </span>
        </button>
      )}
    </header>
  );
}
