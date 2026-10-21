type BasketLine = {
  quantity: number;
  product: { name: string; stock: number; archivedAt?: Date | null };
};

export type Shortfall = { name: string; requested: number; available: number; archived: boolean };

/**
 * Basket lines that can't be bought as they are: more than is in stock (stock
 * below zero counts as none), or a product that has been archived.
 */
export function stockShortfalls(lines: BasketLine[]): Shortfall[] {
  return lines
    .filter((line) => line.product.archivedAt || line.quantity > line.product.stock)
    .map((line) => ({
      name: line.product.name,
      requested: line.quantity,
      available: line.product.archivedAt ? 0 : Math.max(0, line.product.stock),
      archived: Boolean(line.product.archivedAt),
    }));
}

/** "White Garri is sold out", "Red Palm Oil: only 2 left", or "… is no longer available". */
export function describeShortfall({ name, available, archived }: Shortfall): string {
  if (archived) return `${name} is no longer available`;
  return available === 0 ? `${name} is sold out` : `${name}: only ${available} left`;
}
