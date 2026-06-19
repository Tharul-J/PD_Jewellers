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
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const fetchWishlist = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/users/profile', {
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          });
          const data = await response.json();
          if (response.ok) {
            setWishlist(data.wishlist || []);
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

  const toggleWishlistItem = async (item: WishlistItem) => {
    if (!user) return; // Ignore if not logged in
    
    // Optimistic update
    const alreadyInWishlist = isInWishlist(item.productId);
    setWishlist(prev => 
      alreadyInWishlist 
        ? prev.filter(w => w.productId !== item.productId)
        : [...prev, item]
    );

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
