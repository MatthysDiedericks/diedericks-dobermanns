/** Finance year selector: 2022 through current year + 2. */
export function financeYearRange(): number[] {
  const endYear = new Date().getFullYear() + 2;
  return Array.from({ length: endYear - 2022 + 1 }, (_, i) => 2022 + i);
}
