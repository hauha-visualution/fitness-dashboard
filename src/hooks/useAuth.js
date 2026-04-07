import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * useAuth — encapsulates all Supabase auth + role-detection logic.
 *
 * Returns:
 *   session       — Supabase Session | null
 *   userRole      — 'coach' | 'client' | 'unknown' | null
 *   coachProfile  — row from `coaches` table | null
 *   clientProfile — row from `clients` table | null
 *   isAuthLoading — true while the initial session is being restored
 *   login         — call after a successful signIn to sync state
 *   logout        — signs out + resets all state
 *   refreshProfile— re-runs detectRole() to reload coach/client data
 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [coachProfile, setCoachProfile] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);

  const detectRole = useCallback(async (sess) => {
    if (!sess?.user) return;

    // 1. Check coaches table
    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('email', sess.user.email)
      .maybeSingle();

    if (coach) {
      setCoachProfile(coach);
      setUserRole('coach');
      // Keep auth_user_id in sync (fire-and-forget)
      if (!coach.auth_user_id || coach.auth_user_id !== sess.user.id) {
        void supabase
          .from('coaches')
          .update({ auth_user_id: sess.user.id })
          .eq('email', sess.user.email);
      }
      return;
    }

    // 2. Check clients by auth_user_id
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', sess.user.id)
      .maybeSingle();

    if (client) {
      setClientProfile(client);
      setUserRole('client');
      return;
    }

    // 3. First-time client login — link by username from metadata
    const metaUsername = sess.user.user_metadata?.username;
    if (metaUsername) {
      const { data: clientByUsername } = await supabase
        .from('clients')
        .select('*')
        .eq('username', metaUsername)
        .is('auth_user_id', null)
        .maybeSingle();

      if (clientByUsername) {
        await supabase
          .from('clients')
          .update({ auth_user_id: sess.user.id })
          .eq('id', clientByUsername.id);

        setClientProfile({ ...clientByUsername, auth_user_id: sess.user.id });
        setUserRole('client');
        return;
      }
    }

    setUserRole('unknown');
  }, []);

  // Bootstrap: restore session + subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) detectRole(initialSession);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) detectRole(sess);
    });

    return () => subscription.unsubscribe();
  }, [detectRole]);

  const login = useCallback((supabaseSession) => {
    setSession(supabaseSession);
    detectRole(supabaseSession);
  }, [detectRole]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCoachProfile(null);
    setClientProfile(null);
    setUserRole(null);
  }, []);

  const refreshProfile = useCallback(() => {
    if (session) detectRole(session);
  }, [session, detectRole]);

  return {
    session,
    userRole,
    coachProfile,
    clientProfile,
    isAuthLoading,
    login,
    logout,
    refreshProfile,
  };
}
