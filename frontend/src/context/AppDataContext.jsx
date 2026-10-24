import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { assigneesApi, metaApi } from '../api/tickets';
import { useApi } from '../hooks/useApi';

const AppDataContext = createContext(null);

// Holds data shared by every page:
//  - meta: allowed statuses, priorities, categories and status transitions
//  - assignees: employees tickets can be assigned to
//  - dataVersion: a counter bumped after every successful mutation. Pages list
//    it as a dependency, so they refetch exactly once after a change, without
//    a full page reload.
export function AppDataProvider({ children }) {
  const [dataVersion, setDataVersion] = useState(0);

  const meta = useApi((signal) => metaApi.get({ signal }), []);
  const assignees = useApi((signal) => assigneesApi.list({ signal }), [dataVersion]);

  const notifyTicketsChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({
      meta: meta.data,
      metaLoading: meta.loading,
      metaError: meta.error,
      reloadMeta: meta.reload,
      assignees: assignees.data || [],
      dataVersion,
      notifyTicketsChanged,
    }),
    [meta.data, meta.loading, meta.error, meta.reload, assignees.data, dataVersion, notifyTicketsChanged]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}
