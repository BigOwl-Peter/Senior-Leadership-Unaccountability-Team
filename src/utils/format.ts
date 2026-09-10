export const money = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
export const millions = (n: number) =>
  `${n < 0 ? '-' : ''}\u00a3${(Math.abs(n) / 1000000).toFixed(2)}m`;
export const number = (n: number) => Math.round(n).toLocaleString('en-GB');
