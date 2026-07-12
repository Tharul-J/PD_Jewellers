import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export function useAdminGuard() {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  const isAdmin = user?.role === 'administrator';

  // Wrap any customer action: if admin, show modal and skip it; else run it.
  const guard = useCallback(
    (action: () => void) => {
      if (isAdmin) {
        setShowWarning(true);
        return;
      }
      action();
    },
    [isAdmin]
  );

  const dismiss = useCallback(() => setShowWarning(false), []);

  return { guard, showWarning, dismiss, isAdmin };
}
