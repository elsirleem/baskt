import Image from "next/image";
import Link from "next/link";
import { getRecipes } from "@/lib/data";
import { PageTitle, cardClass } from "@/components/ui";
import { RecipeMeta } from "@/components/RecipeMeta";

export const metadata = {
  title: "Recipes",
  description: "Cook authentic Nigerian dishes — tap any ingredient to add it to your basket.",
};

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <div>
      <PageTitle subtitle="Cook the classics. Tap any ingredient to drop it straight into your basket.">
        Recipes 🍲
      </PageTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.slug}`}
            className={`${cardClass} group flex flex-col overflow-hidden`}
          >
            <div className="relative aspect-[16/9] bg-brand-pale">
              <Image
                src={recipe.imageUrl}
                alt={recipe.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition group-hover:scale-105"
              />
              {recipe.isPremium && (
                <span className="absolute right-3 top-3 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                  ⭐ AfroPlus
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="font-display text-lg font-bold text-ink group-hover:text-brand">
                {recipe.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-ink-mid">{recipe.description}</p>
              <RecipeMeta
                minutes={recipe.minutes}
                servings={recipe.servings}
                difficulty={recipe.difficulty}
                className="mt-3"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
