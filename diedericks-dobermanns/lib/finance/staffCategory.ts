/** Live Staff expense category. Salaries are logged here. */
export const STAFF_CATEGORY_ID = '29d29518-ad0b-4e75-8c24-3436dabf3084';

export function isStaffCategory(categoryId: string | null | undefined): boolean {
  return categoryId === STAFF_CATEGORY_ID;
}

export function employeeDisplayName(employee: {
  full_name: string;
  preferred_name?: string | null;
}): string {
  const preferred = employee.preferred_name?.trim();
  return preferred || employee.full_name;
}

export function salaryDescription(name: string): string {
  return `${name} — salary`;
}
