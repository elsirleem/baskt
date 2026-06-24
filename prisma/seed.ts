import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Verified-loading Unsplash food images, reused sensibly across SKUs.
const IMG = {
  riceBowl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
  riceGrains: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=600&q=80",
  beans: "https://images.unsplash.com/photo-1610725663727-08695a1ac3ff?w=600&q=80",
  legumes: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600&q=80",
  flour: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80",
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
  noodles: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80",
  food: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
  plantain: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80",
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80",
  cereal: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=600&q=80",
  snack: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&q=80",
};

const PL = "Baskt Private Label";

type Seed = {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  imageUrl: string;
  brand: string;
  isPrivateLabel?: boolean;
  stock?: number;
};

const products: Seed[] = [
  // Grains & Flours
  { slug: "white-garri-1kg", name: "White Garri (1kg)", description: "Premium cassava garri, sourced directly from Nigerian co-ops. Light, crisp, and perfect for eba or soaking.", priceCents: 449, category: "Grains & Flours", imageUrl: IMG.flour, brand: PL, isPrivateLabel: true },
  { slug: "yellow-garri-1kg", name: "Yellow Garri (1kg)", description: "Palm-oil enriched yellow garri with a rich colour and nutty taste. A staple in every home.", priceCents: 469, category: "Grains & Flours", imageUrl: IMG.flour, brand: "Honeywell" },
  { slug: "poundo-yam-flour-1-8kg", name: "Poundo Yam Flour (1.8kg)", description: "Smooth instant pounded yam flour — ready in minutes, no pounding required.", priceCents: 699, category: "Grains & Flours", imageUrl: IMG.flour, brand: "Honeywell" },
  { slug: "semovita-2kg", name: "Semovita (2kg)", description: "Fine semolina-based swallow flour. Soft, stretchy, and quick to prepare.", priceCents: 599, category: "Grains & Flours", imageUrl: IMG.flour, brand: "Dangote" },
  { slug: "semolina-1kg", name: "Semolina (1kg)", description: "Coarse durum wheat semolina for swallow, baking, and breakfast.", priceCents: 499, category: "Grains & Flours", imageUrl: IMG.flour, brand: "Branded" },
  { slug: "maize-meal-1kg", name: "Maize Meal (1kg)", description: "Finely milled white maize for pap, agidi, and porridge.", priceCents: 399, category: "Grains & Flours", imageUrl: IMG.flour, brand: "Branded" },

  // Rice
  { slug: "long-grain-rice-5kg", name: "Long Grain Rice (5kg)", description: "Fluffy, aromatic long grain rice — the foundation of a perfect jollof.", priceCents: 1299, category: "Rice", imageUrl: IMG.riceGrains, brand: "Branded importer" },
  { slug: "ofada-rice-2kg", name: "Ofada Rice (2kg)", description: "Unpolished local Nigerian brown rice with a distinctive earthy aroma. A premium delicacy.", priceCents: 999, category: "Rice", imageUrl: IMG.riceBowl, brand: "Branded importer" },

  // Legumes
  { slug: "brown-beans-1kg", name: "Brown Beans (1kg)", description: "Honey brown beans (oloyin), sourced direct from Nigerian co-ops. Sweet and creamy — ideal for ewa agoyin.", priceCents: 549, category: "Legumes", imageUrl: IMG.beans, brand: PL, isPrivateLabel: true },
  { slug: "black-eyed-peas-1kg", name: "Black-Eyed Peas (1kg)", description: "Clean, dehulled black-eyed peas for moi moi and akara. Co-op sourced.", priceCents: 499, category: "Legumes", imageUrl: IMG.legumes, brand: PL, isPrivateLabel: true },

  // Instant Foods
  { slug: "indomie-chicken-5pack", name: "Indomie Instant Noodles — Chicken (5-pack)", description: "The nation's favourite instant noodles. Quick, comforting, and student-approved.", priceCents: 349, category: "Instant Foods", imageUrl: IMG.noodles, brand: "Dufil Prima" },
  { slug: "indomie-onion-5pack", name: "Indomie Instant Noodles — Onion (5-pack)", description: "Savoury onion-chicken flavour instant noodles, ready in 3 minutes.", priceCents: 349, category: "Instant Foods", imageUrl: IMG.noodles, brand: "Dufil Prima" },
  { slug: "indomie-pepper-soup-5pack", name: "Indomie Instant Noodles — Pepper Soup (5-pack)", description: "Spicy pepper-soup flavoured noodles with a warming kick.", priceCents: 379, category: "Instant Foods", imageUrl: IMG.noodles, brand: "Dufil Prima" },

  // Breakfast
  { slug: "golden-morn-900g", name: "Golden Morn (900g)", description: "Wholegrain maize & soy breakfast cereal. A family favourite, hot or cold.", priceCents: 649, category: "Breakfast", imageUrl: IMG.cereal, brand: "Nestlé Nigeria" },
  { slug: "kuli-kuli-250g", name: "Kuli Kuli (250g)", description: "Crunchy spiced groundnut snack — high protein, perfect with garri or on its own.", priceCents: 399, category: "Breakfast", imageUrl: IMG.snack, brand: "Artisan processor" },

  // Soups & Oils
  { slug: "ground-egusi-500g", name: "Ground Egusi (500g)", description: "Finely milled melon seeds for rich, thick egusi soup. Baskt private label — our highest-frequency line.", priceCents: 699, category: "Soups & Oils", imageUrl: IMG.spices, brand: PL, isPrivateLabel: true },
  { slug: "ogbono-250g", name: "Ogbono (Ground, 250g)", description: "Ground wild mango seeds for a silky, drawing ogbono soup.", priceCents: 749, category: "Soups & Oils", imageUrl: IMG.spices, brand: "Branded" },
  { slug: "red-palm-oil-1l", name: "Red Palm Oil (1L)", description: "Unrefined, vitamin-rich red palm oil with deep colour and authentic flavour. Baskt private label.", priceCents: 899, category: "Soups & Oils", imageUrl: IMG.oil, brand: PL, isPrivateLabel: true },
  { slug: "ground-crayfish-200g", name: "Ground Crayfish (200g)", description: "Smoky dried crayfish, ground fine — the secret umami in soups and stews.", priceCents: 599, category: "Soups & Oils", imageUrl: IMG.spices, brand: "Specialist importer" },

  // Spices
  { slug: "pepper-soup-spice-100g", name: "Pepper Soup Spice (100g)", description: "Aromatic blend for classic Nigerian pepper soup — warming and fragrant.", priceCents: 349, category: "Spices", imageUrl: IMG.spices, brand: "Branded" },
  { slug: "yaji-suya-spice-100g", name: "Yaji Suya Spice (100g)", description: "Authentic suya pepper blend with groundnut, ginger, and chilli. Baskt private label.", priceCents: 399, category: "Spices", imageUrl: IMG.spices, brand: PL, isPrivateLabel: true },
  { slug: "cameroon-pepper-100g", name: "Cameroon Pepper (100g)", description: "Fiery ground dried chilli — a little goes a long way.", priceCents: 449, category: "Spices", imageUrl: IMG.spices, brand: "Nigerian supplier" },

  // Dried Proteins
  { slug: "dried-stockfish-200g", name: "Dried Stockfish (200g)", description: "Premium dried cod (panla), rich in flavour for soups and stews.", priceCents: 999, category: "Dried Proteins", imageUrl: IMG.food, brand: "Specialist importer" },
  { slug: "dried-ponmo-200g", name: "Dried Ponmo (200g)", description: "Dried cow skin, ready to soften for soups and pepper stews. Baskt private label.", priceCents: 799, category: "Dried Proteins", imageUrl: IMG.food, brand: PL },

  // Snacks & Pantry
  { slug: "plantain-chips-150g", name: "Plantain Chips (150g)", description: "Crispy salted plantain crisps — the perfect savoury snack.", priceCents: 249, category: "Snacks", imageUrl: IMG.plantain, brand: "Branded" },
  { slug: "maggi-seasoning-cubes-100ct", name: "Maggi Seasoning Cubes (100 cubes)", description: "The essential flavour base for every Nigerian kitchen.", priceCents: 399, category: "Pantry", imageUrl: IMG.food, brand: "Nestlé" },
  { slug: "tinned-tomatoes-6pack", name: "Tinned Plum Tomatoes (6 × 400g)", description: "Rich Italian plum tomatoes — the base of jollof and stews.", priceCents: 499, category: "Pantry", imageUrl: IMG.tomato, brand: "Gino" },
  { slug: "puna-yam-tuber", name: "Puna Yam Tuber (~2.5kg)", description: "Fresh West African puna yam — boil, fry, pound, or roast.", priceCents: 699, category: "Produce", imageUrl: IMG.food, brand: "Branded" },
];

const recipes: {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  servings: number;
  minutes: number;
  isPremium: boolean;
  steps: string[];
  ingredients: { label: string; slug?: string }[];
}[] = [
  {
    slug: "classic-jollof-rice",
    title: "Classic Jollof Rice",
    description: "The party-favourite one-pot rice, simmered in a smoky pepper-tomato base.",
    imageUrl: IMG.riceBowl,
    servings: 6,
    minutes: 60,
    isPremium: false,
    steps: [
      "Blend tinned tomatoes with peppers, onion, and a little water into a smooth base.",
      "Fry the base in oil until reduced and the raw smell is gone, 15–20 minutes.",
      "Stir in seasoning cubes, spices, and stock; add washed long grain rice.",
      "Cover tightly and cook on low until the rice is tender and slightly smoky, ~30 minutes.",
      "Fluff and serve hot with plantain or chicken.",
    ],
    ingredients: [
      { label: "1.5 cups long grain rice", slug: "long-grain-rice-5kg" },
      { label: "1 tin plum tomatoes", slug: "tinned-tomatoes-6pack" },
      { label: "3 Maggi seasoning cubes", slug: "maggi-seasoning-cubes-100ct" },
      { label: "1 tsp Cameroon pepper", slug: "cameroon-pepper-100g" },
      { label: "Vegetable oil" },
    ],
  },
  {
    slug: "egusi-soup",
    title: "Egusi Soup",
    description: "Thick, rich melon-seed soup with leafy greens and your choice of protein.",
    imageUrl: IMG.spices,
    servings: 4,
    minutes: 50,
    isPremium: false,
    steps: [
      "Mix ground egusi with a little water into a paste.",
      "Heat red palm oil, add chopped onion, then spoon in egusi paste in lumps.",
      "Add stock, ground crayfish, and seasoning; simmer 20 minutes.",
      "Stir in spinach or bitterleaf and cooked protein; simmer 10 more minutes.",
      "Serve with garri (eba) or pounded yam.",
    ],
    ingredients: [
      { label: "500g ground egusi", slug: "ground-egusi-500g" },
      { label: "4 tbsp red palm oil", slug: "red-palm-oil-1l" },
      { label: "2 tbsp ground crayfish", slug: "ground-crayfish-200g" },
      { label: "Garri for eba", slug: "white-garri-1kg" },
      { label: "Spinach or bitterleaf" },
    ],
  },
  {
    slug: "suya-skewers",
    title: "Beef Suya Skewers",
    description: "Smoky, spicy grilled beef skewers crusted in yaji. A Plus-members exclusive.",
    imageUrl: IMG.food,
    servings: 4,
    minutes: 40,
    isPremium: true,
    steps: [
      "Slice beef thinly and toss with oil and half the yaji spice.",
      "Thread onto skewers and coat generously with more yaji.",
      "Grill over high heat, turning, until charred at the edges.",
      "Dust with extra yaji and serve with sliced onion and tomato.",
    ],
    ingredients: [
      { label: "4 tbsp yaji suya spice", slug: "yaji-suya-spice-100g" },
      { label: "1 tin tomatoes (garnish)", slug: "tinned-tomatoes-6pack" },
      { label: "500g thinly sliced beef" },
      { label: "Vegetable oil" },
    ],
  },
  {
    slug: "akara-bean-fritters",
    title: "Akara (Bean Fritters)",
    description: "Fluffy deep-fried black-eyed pea fritters — a beloved breakfast.",
    imageUrl: IMG.beans,
    servings: 4,
    minutes: 45,
    isPremium: false,
    steps: [
      "Soak black-eyed peas, rub off the skins, and drain.",
      "Blend to a thick, smooth batter with a little water, onion, and pepper.",
      "Whisk the batter to incorporate air until light and fluffy.",
      "Scoop spoonfuls into hot oil and fry golden, turning once.",
      "Drain and serve hot with pap (Golden Morn) or bread.",
    ],
    ingredients: [
      { label: "2 cups black-eyed peas", slug: "black-eyed-peas-1kg" },
      { label: "Golden Morn to serve", slug: "golden-morn-900g" },
      { label: "1 tsp Cameroon pepper", slug: "cameroon-pepper-100g" },
      { label: "Vegetable oil for frying" },
    ],
  },
];

async function main() {
  console.log("Seeding Baskt catalogue...");

  // Remove products no longer in the catalogue (old Western seed), keeping referenced ones.
  const slugs = products.map((p) => p.slug);
  await prisma.product.deleteMany({ where: { slug: { notIn: slugs } } });

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...p, currency: "gbp" },
      create: { ...p, currency: "gbp" },
    });
  }
  console.log(`Seeded ${products.length} products.`);

  for (const r of recipes) {
    const recipe = await prisma.recipe.upsert({
      where: { slug: r.slug },
      update: {
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl,
        steps: r.steps,
        servings: r.servings,
        minutes: r.minutes,
        isPremium: r.isPremium,
      },
      create: {
        slug: r.slug,
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl,
        steps: r.steps,
        servings: r.servings,
        minutes: r.minutes,
        isPremium: r.isPremium,
      },
    });

    // Rebuild ingredients for idempotency.
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    let sort = 0;
    for (const ing of r.ingredients) {
      const product = ing.slug
        ? await prisma.product.findUnique({ where: { slug: ing.slug } })
        : null;
      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          productId: product?.id ?? null,
          label: ing.label,
          sortOrder: sort++,
        },
      });
    }
  }
  console.log(`Seeded ${recipes.length} recipes.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
