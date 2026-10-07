import type { Product } from "./catalog";

export type CartItem = Product & {
  quantity: number;
  selectedSize?: string;
};

export const MAX_CART_ITEMS_LIMIT = 50;

const CART_KEY = "formaCart";

export function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("forma-cart-updated"));
}

export function getTotalCartQuantity(cart?: CartItem[]): number {
  const currentCart = cart || loadCart();
  return currentCart.reduce((sum, item) => sum + item.quantity, 0);
}

export function getProductCartQuantity(productId: number, cart?: CartItem[]): number {
  const currentCart = cart || loadCart();
  return currentCart
    .filter((item) => item.id === productId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

export type CartActionResult = {
  success: boolean;
  error?: string;
  cart: CartItem[];
};

export function addProductToCart(product: Product, selectedSize?: string): CartActionResult {
  const cart = loadCart();
  const currentTotal = getTotalCartQuantity(cart);

  if (currentTotal >= MAX_CART_ITEMS_LIMIT) {
    return {
      success: false,
      error: `Cart limit reached! A maximum of ${MAX_CART_ITEMS_LIMIT} items can be in your bag.`,
      cart,
    };
  }

  const productQtyInCart = getProductCartQuantity(product.id, cart);
  if (productQtyInCart >= product.stock) {
    return {
      success: false,
      error: `Cannot add more. Available stock for this piece is ${product.stock} unit${product.stock === 1 ? "" : "s"}.`,
      cart,
    };
  }

  const sizeToSave = selectedSize || product.sizes || "Standard";
  const existingIndex = cart.findIndex(
    (item) => item.id === product.id && (item.selectedSize || "") === sizeToSave
  );

  let nextCart: CartItem[];
  if (existingIndex > -1) {
    nextCart = cart.map((item, index) =>
      index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
    );
  } else {
    nextCart = [...cart, { ...product, selectedSize: sizeToSave, quantity: 1 }];
  }

  saveCart(nextCart);
  return {
    success: true,
    cart: nextCart,
  };
}

export function updateCartItemQuantity(
  productId: number,
  size: string | undefined,
  amount: number
): CartActionResult {
  const cart = loadCart();
  const targetItem = cart.find(
    (item) => item.id === productId && (item.selectedSize || "") === (size || "")
  );
  if (!targetItem) return { success: false, cart };

  if (amount < 0) {
    const nextCart = cart
      .map((item) =>
        item.id === productId && (item.selectedSize || "") === (size || "")
          ? { ...item, quantity: item.quantity + amount }
          : item
      )
      .filter((item) => item.quantity > 0);
    saveCart(nextCart);
    return { success: true, cart: nextCart };
  }

  // Check 50 total cart limit
  const currentTotal = getTotalCartQuantity(cart);
  if (currentTotal + amount > MAX_CART_ITEMS_LIMIT) {
    return {
      success: false,
      error: `Maximum bag limit of ${MAX_CART_ITEMS_LIMIT} items reached.`,
      cart,
    };
  }

  // Check stock limit for this product
  const productQty = getProductCartQuantity(productId, cart);
  if (productQty + amount > targetItem.stock) {
    return {
      success: false,
      error: `Cannot add more than available stock (${targetItem.stock}).`,
      cart,
    };
  }

  const nextCart = cart.map((item) =>
    item.id === productId && (item.selectedSize || "") === (size || "")
      ? { ...item, quantity: item.quantity + amount }
      : item
  );
  saveCart(nextCart);
  return { success: true, cart: nextCart };
}

export function removeCartItem(productId: number, selectedSize?: string) {
  const cart = loadCart();
  const nextCart = cart.filter(
    (item) => !(item.id === productId && (!selectedSize || item.selectedSize === selectedSize))
  );
  saveCart(nextCart);
  return nextCart;
}

export function updateCartItemSize(productId: number, oldSize: string | undefined, newSize: string) {
  const cart = loadCart();
  const targetIndex = cart.findIndex(
    (item) => item.id === productId && (item.selectedSize || "") === (oldSize || "")
  );
  if (targetIndex === -1) return cart;

  const existingWithNewSizeIndex = cart.findIndex(
    (item, idx) => idx !== targetIndex && item.id === productId && (item.selectedSize || "") === newSize
  );

  let nextCart: CartItem[];
  if (existingWithNewSizeIndex > -1) {
    nextCart = cart
      .map((item, idx) => {
        if (idx === existingWithNewSizeIndex) {
          return { ...item, quantity: item.quantity + cart[targetIndex].quantity };
        }
        return item;
      })
      .filter((_, idx) => idx !== targetIndex);
  } else {
    nextCart = cart.map((item, idx) =>
      idx === targetIndex ? { ...item, selectedSize: newSize } : item
    );
  }

  saveCart(nextCart);
  return nextCart;
}

export function clearCart() {
  saveCart([]);
  return [];
}




