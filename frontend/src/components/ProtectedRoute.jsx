import { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { apiFetch } from '../csrfClient';
import ChangePasswordDialog from './ChangePasswordDialog';

const API = import.meta.env.VITE_API_URL;

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const navigate = useNavigate();

  const fetchSession = useCallback(async () => {
    try {
      const userData = JSON.parse(sessionStorage.getItem('user')).user;
      const res = await apiFetch(`${API}/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        setAuthed(false);
        setMustChange(false);
        return;
      }

      const data = res.data; // { user: { ... } }
      const user = data?.user;
      console.log(Boolean(user?.must_change_password));

      setAuthed(Boolean(user));
      setMustChange(Boolean(user?.must_change_password));
    } catch (_) {
      setAuthed(false);
      setMustChange(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Called by ChangePasswordDialog after successful change
  const handleChanged = async () => {
    setLoading(true);
    await fetchSession();
  };

  if (loading) {
    return (
      <div
        style={{ display: 'grid', placeItems: 'center', height: '60vh', fontFamily: 'sans-serif' }}
      >
        Checking session…
      </div>
    );
  }

  if (!authed) {
    // Not logged in
    return <Navigate to="/" replace />;
  }

  if (mustChange) {
    // Block the app until password is changed
    return (
      <>
        <ChangePasswordDialog open={true} onClose={() => {}} onChanged={handleChanged} />
        {/* Optional dim background to indicate blocking */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      </>
    );
  }

  // Auth OK and no forced change → render protected content
  return children;
}

// import { useEffect, useState } from 'react';
// import { Navigate } from 'react-router-dom';
// import { apiFetch } from "../csrfClient";

// const API = import.meta.env.VITE_API_URL;

// export default function ProtectedRoute({ children }) {
//   const [state, setState] = useState({ loading: true, ok: false });

//   useEffect(() => {
//     let cancelled = false;
//     const controller = new AbortController();

//     (async () => {
//       try {
//         const res = await apiFetch(`${API}/auth/session`, {
//           credentials: 'include',
//           signal: controller.signal,
//         });
//         if (!cancelled) setState({ loading: false, ok: res.ok });
//       } catch (e) {
//         if (!cancelled) setState({ loading: false, ok: false });
//       }
//     })();

//     return () => {
//       cancelled = true;
//       controller.abort();
//     };
//   }, []);

//   if (state.loading) {
//     // simple inline loader so “blank page” becomes obviously loading
//     return (
//       <div style={{display:'grid',placeItems:'center',height:'60vh',fontFamily:'sans-serif'}}>
//         Checking session…
//       </div>
//     );
//   }

//   if (!state.ok) return <Navigate to="/" replace />;
//   return children;
// }
