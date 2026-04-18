import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * AppContext — global coach state (clients list + refresh).
 *
 * Wrap the coach view with <AppProvider session={session}>.
 * Access via: const { clients, isLoading, refreshClients } = useAppContext();
 */

const AppContext = createContext(null);

export function AppProvider({ session, children }) {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshClients = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const fetchClients = useCallback(async () => {
    if (!session?.user?.email) return;
    setIsLoading(true);

    const coachEmail = session.user.email;
    const [{ data: clientRows, error }, { data: pkgs }, { data: sessDone }] = await Promise.all([
      supabase.from('clients').select('*').eq('coach_email', coachEmail),
      supabase
        .from('packages')
        .select('client_id, total_sessions, status')
        .eq('status', 'active'),
      supabase
        .from('sessions')
        .select('client_id')
        .eq('status', 'completed'),
    ]);

    if (error) {
      console.error('[AppContext] fetchClients error:', error.message);
      setIsLoading(false);
      return;
    }

    const clientList = clientRows || [];
    const ids = new Set(clientList.map((c) => c.id));

    const doneMap = {};
    (sessDone || [])
      .filter((s) => ids.has(s.client_id))
      .forEach((s) => { doneMap[s.client_id] = (doneMap[s.client_id] || 0) + 1; });

    const pkgMap = {};
    (pkgs || [])
      .filter((p) => ids.has(p.client_id))
      .forEach((p) => {
        pkgMap[p.client_id] = {
          total: p.total_sessions,
          remaining: p.total_sessions - (doneMap[p.client_id] || 0),
          hasActive: true,
        };
      });

    setClients(
      clientList.map((db) => ({
        ...db,
        avatar:
          db.avatar_url ||
          `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name}&backgroundColor=eceff4`,
        package: pkgMap[db.id] || { total: 0, remaining: '--', hasActive: false },
      })),
    );
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchClients();
  }, [fetchClients, refreshKey]);

  const value = {
    clients,
    isLoading,
    refreshClients,
    refetchClients: fetchClients,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}
