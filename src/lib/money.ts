// Amounts are whole rupees (PKR integers only). Shown as "Rs 2,500".
export function formatRs(amount: number): string {
  const whole = Math.round(amount);
  return `Rs ${whole.toLocaleString('en-US')}`;
}

export const HIDDEN_AMOUNT = 'Rs ***';
