interface ProgressCardProps {
  taken: number;
  total: number;
}

export default function ProgressCard({ taken, total }: ProgressCardProps) {
  const percent = total === 0 ? 0 : Math.round((taken / total) * 100);

  return (
    <section className="rounded-[20px] bg-white p-4 shadow-card dark:bg-white/8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-app-text dark:text-white">Прогресс на сегодня</h2>
        <span className="text-sm font-bold text-app-green">
          {taken} из {total}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-emerald-50 dark:bg-white/10">
        <div className="h-full rounded-full bg-app-green transition-all" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
