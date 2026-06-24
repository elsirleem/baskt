import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice } from "@/lib/utils";
import { getRecipeBySlug, getCurrentUserId, getUserTier } from "@/lib/data";
import { AddToCartButton } from "@/components/ProductActions";
import { AddAllToCartButton } from "@/components/AddAllToCartButton";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe not found — Baskt" };
  return { title: `${recipe.title} — Baskt`, description: recipe.description };
}

export default async function RecipePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const userId = await getCurrentUserId();
  const tier = userId ? await getUserTier(userId) : "PAYG";
  const locked = recipe.isPremium && tier !== "PLUS";

  const shoppableIds = recipe.ingredients
    .map((i) => i.product?.id)
    .filter((id): id is string => Boolean(id));

  return (
    <div>
      <Link href="/recipes" className="text-sm text-emerald-700 hover:underline">
        ← All recipes
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-stone-200">
          <Image
            src={recipe.imageUrl}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>
        <div>
          {recipe.isPremium && (
            <span className="mb-2 inline-block rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
              Plus recipe
            </span>
          )}
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
          <p className="mt-2 text-stone-600">{recipe.description}</p>
          <p className="mt-3 text-sm text-stone-400">
            {recipe.minutes} min · serves {recipe.servings}
          </p>
        </div>
      </div>

      {locked ? (
        <div className="mt-10 rounded-xl border border-amber-300 bg-amber-50 p-8 text-center">
          <h2 className="text-xl font-semibold text-amber-900">This is a Baskt Plus recipe</h2>
          <p className="mt-2 text-amber-800">
            Unlock the premium recipe library — plus 10% off and free delivery — with Baskt Plus.
          </p>
          <Link
            href="/membership"
            className="mt-4 inline-block rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            See membership
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ingredients</h2>
            </div>
            <ul className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-stone-800">{ing.label}</p>
                    {ing.product ? (
                      <Link
                        href={`/product/${ing.product.slug}`}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        {ing.product.name} · {formatPrice(ing.product.priceCents, ing.product.currency)}
                      </Link>
                    ) : (
                      <span className="text-xs text-stone-400">Pantry basic</span>
                    )}
                  </div>
                  {ing.product && (
                    <AddToCartButton productId={ing.product.id} className="shrink-0" />
                  )}
                </li>
              ))}
            </ul>
            {shoppableIds.length > 0 && (
              <div className="mt-4">
                <AddAllToCartButton productIds={shoppableIds} />
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Method</h2>
            <ol className="mt-3 space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-stone-700">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
