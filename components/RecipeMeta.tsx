/** "⏱ 45 mins · 👥 4 servings · ⚡ Medium" row shown on recipe cards and pages. */
export function RecipeMeta({
  minutes,
  servings,
  difficulty,
  className = "",
}: {
  minutes: number;
  servings: number;
  difficulty: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft ${className}`}>
      <span>⏱ {minutes} mins</span>
      <span>👥 {servings} servings</span>
      <span>⚡ {difficulty}</span>
    </div>
  );
}
