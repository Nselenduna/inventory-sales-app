// Utility for formatting currency consistently across the app
export function formatCurrency(amount: number, currency: string = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
} 