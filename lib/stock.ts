type BasketLine = { quantity: number; product: { name: string; stock: number } };

export type Shortfall = { name: string; requested: number; available: number };

/** Basket lines asking for more than is in stock (stock below zero counts as none). */
export function stockShortfalls(lines: BasketLine[]): Shortfall[] {
  return lines
    .filter((line) => line.quantity > line.product.stock)
    .map((line) => ({
      name: line.product.name,
      requested: line.quantity,
      available: Math.max(0, line.product.stock),
    }));
}

/** "White Garri is sold out" or "Red Palm Oil: only 2 left". */
export function describeShortfall({ name, available }: Shortfall): string {
  return available === 0 ? `${name} is sold out` : `${name}: only ${available} left`;
}
