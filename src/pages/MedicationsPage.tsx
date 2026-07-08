import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import MedicationCard from "../components/MedicationCard";
import type { Medication } from "../types/medication";

type Filter = "all" | "active" | "done";

interface MedicationsPageProps {
  medications: Medication[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (medication: Medication) => void;
}

export default function MedicationsPage({ medications, onAdd, onOpen, onDelete, onToggleActive }: MedicationsPageProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);

  const visible = useMemo(() => {
    return medications.filter((medication) => {
      const matchesQuery = medication.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === "all" || (filter === "active" && medication.isActive) || (filter === "done" && !medication.isActive);
      return matchesQuery && matchesFilter;
    });
  }, [filter, medications, query]);

  return (
    <>
      <header className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-app-text dark:text-white">Мои лекарства</h1>
          <button onClick={onAdd} className="grid h-11 w-11 place-items-center rounded-full bg-app-green text-white shadow-lg shadow-emerald-500/25">
            <Plus size={24} />
          </button>
        </div>
        <label className="mt-4 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-card dark:bg-white/8">
          <Search size={20} className="text-app-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-app-muted dark:text-white"
          />
        </label>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-full bg-white p-1 shadow-card dark:bg-white/8">
          {[
            ["all", "Все"],
            ["active", "Активные"],
            ["done", "Завершенные"]
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as Filter)}
              className={`rounded-full px-3 py-2 text-sm font-bold ${
                filter === value ? "bg-app-green text-white" : "text-app-text dark:text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <main className="space-y-3 px-5 pb-28">
        <div className="rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100">
          Если появились сильная боль, аллергия, кровь в стуле, сильная слабость или ухудшение состояния — обратитесь к врачу.
        </div>
        {visible.length === 0 ? (
          <EmptyState
            title="Лекарств пока нет"
            text="Добавьте первый препарат, чтобы получать напоминания."
            actionLabel="Добавить лекарство"
            onAction={onAdd}
          />
        ) : (
          visible.map((medication) => (
            <div key={medication.id} className="relative">
              <MedicationCard medication={medication} onOpen={onOpen} onMenu={setMenuId} />
              {menuId === medication.id ? (
                <div className="absolute right-4 top-14 z-10 w-52 overflow-hidden rounded-[20px] bg-white p-2 shadow-soft dark:bg-[#17231f]">
                  <button onClick={() => onOpen(medication.id)} className="w-full rounded-2xl px-3 py-2 text-left text-sm font-bold text-app-text hover:bg-slate-100 dark:text-white dark:hover:bg-white/10">
                    Редактировать
                  </button>
                  <button onClick={() => onToggleActive(medication)} className="w-full rounded-2xl px-3 py-2 text-left text-sm font-bold text-app-text hover:bg-slate-100 dark:text-white dark:hover:bg-white/10">
                    {medication.isActive ? "Завершить курс" : "Возобновить курс"}
                  </button>
                  <button onClick={() => onDelete(medication.id)} className="w-full rounded-2xl px-3 py-2 text-left text-sm font-bold text-app-danger hover:bg-red-50 dark:hover:bg-red-400/10">
                    Удалить
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </main>
    </>
  );
}
