import Image from "next/image";
import Link from "next/link";
import { getRecipes } from "@/lib/data";

export const metadata = {
  title: "Recipes — Baskt",
  description: "Cook authentic Nigerian dishes — tap any ingredient to add it to your basket.",
};

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Recipes</h1>
        <p className="mt-1 text-stone-600">
          Cook the classics. Tap any ingredient to drop it straight into your basket.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.slug}`}
            className="group flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={recipe.imageUrl}
                alt={recipe.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition group-hover:scale-105"
              />
              {recipe.isPremium && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  Plus
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="font-semibold text-stone-900 group-hover:text-emerald-700">
                {recipe.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                {recipe.description}
              </p>
              <p className="mt-3 text-xs text-stone-400">
                {recipe.minutes} min · serves {recipe.servings}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
