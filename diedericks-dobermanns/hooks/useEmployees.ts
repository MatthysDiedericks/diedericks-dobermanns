import { useCallback, useEffect, useState } from 'react';

import { fetchEmployeeById, fetchEmployees } from '@/lib/finance/employeeQueries';
import type { Employee } from '@/types/employees';

export function useEmployees(activeOnly = false) {
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchEmployees(activeOnly));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useEmployee(id: string) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setEmployee(await fetchEmployeeById(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { employee, loading, error, refresh };
}
