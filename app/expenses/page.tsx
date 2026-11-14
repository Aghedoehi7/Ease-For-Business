'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string | null;
  createdAt: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const fetchExpenses = async (rangeValue: string = 'all') => {
    try {
      const query = rangeValue === 'all' ? '' : `?range=${rangeValue}`;
      const res = await fetch(`/api/expenses${query}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load expenses');
      }
      const data = await res.json();
      setExpenses(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Unable to load expenses. Please try again.');
    }
  };

  useEffect(() => {
    fetchExpenses(range === 'all' ? '' : range);
  }, [range]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!category.trim()) {
      setError('Category is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses', {
        method: editingExpenseId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          category: category.trim(),
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.error || 'Failed to save expense');
      }

      setAmount('');
      setCategory('');
      setNote('');
      setEditingExpenseId(null);
      await fetchExpenses(range === 'all' ? '' : range);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  const startEditingExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setNote(expense.note ?? '');
    setError('');
  };

  const deleteExpense = async (expense: Expense) => {
    if (!window.confirm(`Delete the ${expense.category} expense of ₦${expense.amount.toFixed(2)}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error || 'Failed to delete expense');
      }
      if (editingExpenseId === expense.id) cancelExpenseEdit();
      await fetchExpenses(range === 'all' ? '' : range);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete expense.');
    }
  };

  const cancelExpenseEdit = () => {
    setEditingExpenseId(null);
    setAmount('');
    setCategory('');
    setNote('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Tracker</h1>
            <p className="mt-2 text-gray-600">Record and review business expenses quickly.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'today', 'week', 'month'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`px-4 py-2 rounded-lg border font-medium transition ${
                  range === value ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50'
                }`}
              >
                {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[350px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingExpenseId ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="e.g. 2500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="e.g. Supplies"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Note</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-2 w-full min-h-[100px] rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="Optional note"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-orange-600 px-4 py-3 text-white font-semibold shadow hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Save Expense'}
              </button>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={cancelExpenseEdit}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel edit
                </button>
              )}
            </form>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Expenses</h2>
                <p className="text-sm text-gray-900">Showing {range === 'all' ? 'all' : range} expenses.</p>
              </div>
              <button
                onClick={() => fetchExpenses(range === 'all' ? '' : range)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {expenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-900">
                  No expenses found.
                </div>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{expense.category}</p>
                        <p className="mt-1 text-sm text-gray-600">{expense.note || 'No note'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">₦{expense.amount.toFixed(2)}</p>
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingExpense(expense)}
                            aria-label={`Edit ${expense.category} expense`}
                            className="rounded p-1.5 text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteExpense(expense)}
                            aria-label={`Delete ${expense.category} expense`}
                            className="rounded p-1.5 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-wide text-gray-900">
                      {new Date(expense.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
