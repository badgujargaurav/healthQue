import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithAuth, API_BASE } from '../utils/api';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const inflightRef = React.useRef(null);
  const refreshProfile = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current;
    const p = (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/profile`);
        if (!res || !res.ok) {
          setProfile(null);
          setLoading(false);
          return null;
        }
        const data = await res.json().catch(() => null);
        setProfile(data || null);
        setLoading(false);
        return data || null;
      } catch (e) {
        setProfile(null);
        setLoading(false);
        return null;
      } finally {
        inflightRef.current = null;
      }
    })();
    inflightRef.current = p;
    return p;
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refreshProfile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

export default ProfileContext;
