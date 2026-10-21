import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice, productLabel } from "@/lib/utils";
import { getRecipeBySlug, getCurrentUserId, getUserTier } from "@/lib/data";
import { AddToCartButton } from "@/components/ProductActions";
import { AddAllToCartButton } from "@/components/AddAllToCartButton";
import { BackButton, buttonClass } from "@/components/ui";
import { RecipeMeta } from "@/components/RecipeMeta";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe not found" };
  return { title: recipe.title, description: recipe.description };
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
    <div className="-mx-4 -mt-2 md:mx-0 md:mt-0">
      <div className="relative h-[200px] bg-linear-to-br from-brand to-brand-dark md:h-[320px] md:overflow-hidden md:rounded-2xl">
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          fill
          sizes="(max-width: 768px) 100vw, 1100px"
          className="object-cover"
          priority
        />
        <BackButton href="/recipes" label="All recipes" />
      </div>

      <div className="relative -mt-5 rounded-t-3xl bg-white px-5 pb-6 pt-6 md:mt-6 md:rounded-2xl md:p-8 md:shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        {recipe.isPremium && (
          <span className="mb-2 inline-block rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
            ⭐ AfroPlus recipe
          </span>
        )}
        <h1 className="font-display text-[22px] font-bold md:text-3xl">{recipe.title}</h1>
        <p className="mt-1 text-sm text-ink-mid md:text-base">{recipe.description}</p>
        <RecipeMeta
          minutes={recipe.minutes}
          servings={recipe.servings}
          difficulty={recipe.difficulty}
          className="mb-5 mt-3"
        />

        {locked ? (
          <div className="rounded-2xl border-[1.5px] border-gold bg-gold-light p-6 text-center">
            <p className="text-3xl" aria-hidden="true">
              ⭐
            </p>
            <h2 className="mt-2 font-display text-xl font-bold">This is an AfroPlus recipe</h2>
            <p className="mt-2 text-sm text-ink-mid">
              Unlock the premium recipe library — plus 10% off and free delivery on every
              order — with AfroPlus.
            </p>
            <Link href="/membership" className={`${buttonClass.primary} mt-4`}>
              See plans
            </Link>
          </div>
        ) : (
          <div className="md:grid md:grid-cols-2 md:gap-10">
            <section>
              <h2 className="mb-1 font-display text-[15px] font-bold md:text-lg">
                Ingredients — tap to add 🛒
              </h2>
              <ul>
                {recipe.ingredients.map((ing) => (
                  <li
                    key={ing.id}
                    className="flex items-center gap-3 border-b border-line py-2.5 last:border-0"
                  >
                    {ing.product ? (
                      <Link
                        href={`/product/${ing.product.slug}`}
                        tabIndex={-1}
                        aria-hidden="true"
                        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-brand-pale"
                      >
                        <Image
                          src={ing.product.imageUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </Link>
                    ) : (
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-lg"
                        aria-hidden="true"
                      >
                        🧂
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{ing.label}</p>
                      {ing.product ? (
                        <Link
                          href={`/product/${ing.product.slug}`}
                          className="block truncate text-xs text-ink-soft hover:text-brand"
                        >
                          {productLabel(ing.product)} ·{" "}
                          {formatPrice(ing.product.priceCents, ing.product.currency)}
                        </Link>
                      ) : (
                        <p className="text-xs text-ink-soft">Pantry basic</p>
                      )}
                    </div>
                    {ing.amount && (
                      <span className="shrink-0 text-[13px] text-ink-soft">{ing.amount}</span>
                    )}
                    {ing.product && (
                      <AddToCartButton
                        productId={ing.product.id}
                        productName={ing.product.name}
                        variant="pill"
                        disabled={ing.product.stock <= 0}
                      />
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

            <section className="mt-6 md:mt-0">
              <h2 className="mb-2.5 font-display text-[15px] font-bold md:text-lg">
                How to Cook 👨‍🍳
              </h2>
              <ol className="space-y-2.5">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-2xl bg-cream px-4 py-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="text-[13px] leading-relaxed text-ink-mid md:text-sm">{step}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-2xl border-[1.5px] border-gold bg-gold-light p-3.5">
                <p className="text-[13px] font-semibold text-ink">💡 AfroPantry tip</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">
                  {tier === "PLUS"
                    ? "As an AfroPlus member, your 10% saving is applied automatically at checkout."
                    : "Tap + Add to drop ingredients into your basket. AfroPlus members save 10% automatically at checkout."}
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
