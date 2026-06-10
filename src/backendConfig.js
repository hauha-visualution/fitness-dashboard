export const BACKEND_PROVIDER = import.meta.env.VITE_BACKEND_PROVIDER || 'supabase';

export const isFirebaseBackend = () => BACKEND_PROVIDER === 'firebase';

