export type ExpenseInput = {
  amount: number;
  category: string;
  note: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateExpenseInput(value: unknown) {
  const errors: string[] = [];
  const body = isRecord(value) ? value : {};
  const amount = Number(body.amount);
  const roundedAmount = Math.round(amount * 100) / 100;
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : null;

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    roundedAmount <= 0
  ) {
    errors.push('Amount must be a positive number with supported currency precision');
  }

  if (!category) {
    errors.push('Category is required');
  } else if (category.length > 100) {
    errors.push('Category must be 100 characters or fewer');
  }

  if (note && note.length > 1000) {
    errors.push('Note must be 1000 characters or fewer');
  }

  return {
    ok: errors.length === 0,
    errors,
    parsed: { amount: roundedAmount, category, note } satisfies ExpenseInput,
  } as const;
}
