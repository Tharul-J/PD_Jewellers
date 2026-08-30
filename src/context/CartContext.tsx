import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  // `id` is the variant key — it encodes the selected options so two
  // configurations of the same piece stay separate lines. `sku` is the catalog
  // product id, which is what orders and reviews need to reference.
  id: string;
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  options?: any;
  /** True for configurator pieces with no catalog photo — render a label instead of an <img>. */
  isCustomDesign?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  /** True when a line with this exact id (the full configuration) is already in the cart. */
  isDuplicate: (item: Pick<CartItem, 'id'>) => boolean;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  cartTotal: number;
  /** Bumped when an inquiry is submitted, so open views can refresh their list. */
  lastSubmittedAt: number | null;
  markInquirySubmitted: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems(currentItems => {
      const existing = currentItems.find(item => item.id === newItem.id);
      if (existing) {
        return currentItems.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
            : item
        );
      }
      return [...currentItems, { ...newItem, quantity: newItem.quantity || 1 }];
    });
    setIsCartOpen(true);
  };

  // `id` encodes the full configuration (product + metal + stone + size + ...),
  // so an exact id match means the caller is re-adding the identical piece —
  // that's the case worth a heads-up before it silently bumps quantity. A
  // different id for the same product (e.g. a different size) is a distinct
  // line, so it isn't a duplicate. Callers check this before calling
  // addToCart and decide whether to confirm with the user; addToCart itself
  // always just adds/merges.
  const isDuplicate = (newItem: Pick<CartItem, 'id'>): boolean => {
    return items.some(item => item.id === newItem.id);
  };

  const removeFromCart = (id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  // Submitting happens on the checkout page, but the drawer may be open behind
  // it — this lets it refresh its submitted-requests list without polling.
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const markInquirySubmitted = () => setLastSubmittedAt(Date.now());

  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        isDuplicate,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartTotal,
        lastSubmittedAt,
        markInquirySubmitted
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
