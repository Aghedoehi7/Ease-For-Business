export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function truncateText(text: string, length: number): string {
  return text.length > length ? `${text.substring(0, length)}...` : text;
}

export const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Inventory', href: '/inventory' },
  { name: 'About', href: '#about' },
  { name: 'Contact', href: '#contact' },
];
