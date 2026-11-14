export type ProductInput = {
  name: string;
  description: string | null;
  price: number;
  costPrice: number;
  quantity: number;
  sku: string;
  category: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseProductInput(value: unknown): ProductInput | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const sku = typeof value.sku === 'string' ? value.sku.trim() : '';
  const price = Number(value.price);
  const costPrice =
    value.costPrice === '' || value.costPrice == null
      ? Number.NaN
      : Number(value.costPrice);
  const quantity = Number(value.quantity);
  const roundedPrice = Math.round(price * 100) / 100;
  const roundedCostPrice = Math.round(costPrice * 100) / 100;

  if (
    !name ||
    !sku ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isSafeInteger(Math.round(price * 100)) ||
    roundedPrice <= 0 ||
    !Number.isFinite(costPrice) ||
    costPrice < 0 ||
    !Number.isSafeInteger(Math.round(costPrice * 100)) ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 2_147_483_647
  ) {
    return null;
  }

  return {
    name,
    description: typeof value.description === 'string' ? value.description.trim() || null : null,
    price: roundedPrice,
    costPrice: roundedCostPrice,
    quantity,
    sku,
    category: typeof value.category === 'string' ? value.category.trim() || null : null,
  };
}
