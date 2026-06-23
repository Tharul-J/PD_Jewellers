import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface WishlistItem {
  productId: string;
  name: string;
  price: string;
  image: string;
  category: string;
  isCustom?: boolean;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  toggleWishlistItem: (item: WishlistItem) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        const stored = localStorage.getItem(`wishlist_${parsedUser._id}`);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const fetchWishlist = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/users/profile', {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          const data = await response.json();
          if (response.ok) {
            let currentWishlist: WishlistItem[] = data.wishlist || [];
            setWishlist(currentWishlist);
            localStorage.setItem(`wishlist_${user._id}`, JSON.stringify(currentWishlist));

            // Auto-add any item the user tried to wishlist before logging in
            const pending = localStorage.getItem('pending_wishlist_item');
            if (pending) {
              localStorage.removeItem('pending_wishlist_item');
              try {
                const pendingItem: WishlistItem = JSON.parse(pending);
                const alreadyIn = currentWishlist.some(w => w.productId === pendingItem.productId);
                if (!alreadyIn) {
                  const res = await fetch('/api/users/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                    body: JSON.stringify(pendingItem)
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setWishlist(updated);
                    localStorage.setItem(`wishlist_${user._id}`, JSON.stringify(updated));
                  }
                }
              } catch {}
            }
          }
        } catch (error) {
          console.error("Error fetching wishlist", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [user]);

  // Keep other open tabs in sync when this tab updates localStorage
  useEffect(() => {
    if (!user) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `wishlist_${user._id}` && e.newValue !== null) {
        try { setWishlist(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  const toggleWishlistItem = async (item: WishlistItem) => {
    if (!user) return; // Ignore if not logged in
    
    // Optimistic update
    const alreadyInWishlist = isInWishlist(item.productId);
    const updatedList = alreadyInWishlist 
      ? wishlist.filter(w => w.productId !== item.productId)
      : [...wishlist, item];

    setWishlist(updatedList);
    localStorage.setItem(`wishlist_${user._id}`, JSON.stringify(updatedList));

    try {
      const response = await fetch('/api/users/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(item)
      });
      const data = await response.json();
      if (response.ok) {
        setWishlist(data);
        localStorage.setItem(`wishlist_${user._id}`, JSON.stringify(data));
      } else {
        // Revert on error
         console.error('Failed to update wishlist:', data.message);
      }
    } catch (error) {
      console.error("Error updating wishlist", error);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.productId === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlistItem, isInWishlist, isLoading }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
