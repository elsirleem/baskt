/** Icon shown on the home page's category tiles; unknown categories get a basket. */
const CATEGORY_ICONS: Record<string, string> = {
  All: "🧺",
  Breakfast: "🥣",
  "Dried Proteins": "🐟",
  "Grains & Flours": "🌾",
  "Instant Foods": "🍜",
  Legumes: "🫘",
  Pantry: "🧂",
  Produce: "🍠",
  Rice: "🍚",
  Snacks: "🍌",
  "Soups & Oils": "🫙",
  Spices: "🌶️",
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "🛒";
}
