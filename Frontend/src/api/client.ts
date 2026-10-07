import { defaultProducts, type Product } from "../data/catalog";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface ProductQueryParams {
  q?: string;
  category?: string;
  tone?: string;
  badge?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "name_asc" | "popular";
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string;
  product_count: number;
}

/**
 * Robust Product API Client with offline/local fallback support
 */
export const productApi = {
  /**
   * Fetch list of products with optional filters
   */
  async getProducts(params?: ProductQueryParams): Promise<Product[]> {
    try {
      const url = new URL(`${API_BASE_URL}/products`);
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            url.searchParams.append(key, String(val));
          }
        });
      }

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json: ProductsResponse = await res.json();
      return json.data;
    } catch {
      // Graceful fallback to local catalog
      return defaultProducts;
    }
  },

  /**
   * Fetch single product by ID or slug
   */
  async getProductById(id: string | number): Promise<Product | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!res.ok) throw new Error("Product not found");
      const json = await res.json();
      return json.data;
    } catch {
      return defaultProducts.find((p) => p.id === Number(id)) || null;
    }
  },

  /**
   * Fetch all categories
   */
  async getCategories(): Promise<CategoryItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.data;
    } catch {
      return [
        { id: 1, name: "Outerwear", slug: "outerwear", product_count: 2 },
        { id: 2, name: "Essentials", slug: "essentials", product_count: 1 },
        { id: 3, name: "Tailoring", slug: "tailoring", product_count: 1 },
        { id: 4, name: "T-shirts", slug: "t-shirts", product_count: 1 },
        { id: 5, name: "Shorts", slug: "shorts", product_count: 1 },
        { id: 6, name: "Accessories", slug: "accessories", product_count: 1 },
        { id: 7, name: "Bottoms", slug: "bottoms", product_count: 1 },
      ];
    }
  },

  /**
   * Create new product (Admin)
   */
  async createProduct(product: Partial<Product>, role = "admin"): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-role": role,
      },
      body: JSON.stringify(product),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create product");
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Update existing product (Admin)
   */
  async updateProduct(id: number, updates: Partial<Product>, role = "admin"): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-role": role,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update product");
    }

    const json = await res.json();
    return json.data;
  },

  /**
   * Quick update stock (Admin)
   */
  async updateStock(id: number, stock: number, role = "admin"): Promise<void> {
    await fetch(`${API_BASE_URL}/products/${id}/stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-role": role,
      },
      body: JSON.stringify({ stock }),
    });
  },

  /**
   * Delete product (Admin)
   */
  async deleteProduct(id: number, role = "admin"): Promise<void> {
    await fetch(`${API_BASE_URL}/products/${id}`, {
      method: "DELETE",
      headers: { "x-role": role },
    });
  },
};

/**
 * Order API Client
 */
export const orderApi = {
  async createOrder(orderData: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error("Order creation failed");
      return await res.json();
    } catch {
      return null;
    }
  },

  async getAdminOrders(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          "x-admin-role": "admin",
          "x-role": "admin",
          Accept: "application/json",
        },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn("Failed to fetch admin orders from server:", err);
      return [];
    }
  },

  async getUserOrders(userId?: string, mobile?: string): Promise<any[]> {
    try {
      const url = new URL(`${API_BASE_URL}/orders`);
      if (userId) url.searchParams.append("userId", userId);
      if (mobile) url.searchParams.append("mobile", mobile);

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getOrders(params?: { userId?: string; mobile?: string; role?: string }): Promise<any[]> {
    if (params?.role === "admin") {
      return this.getAdminOrders();
    }
    return this.getUserOrders(params?.userId, params?.mobile);
  },
};

export interface AuthUserResponse {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile: string;
  role: "customer" | "admin";
  avatar?: string;
  joinedAt?: string;
}

export interface AuthApiResponse {
  success: boolean;
  message?: string;
  data?: AuthUserResponse;
  token?: string;
  error?: string;
  isUnregistered?: boolean;
}

/**
 * Auth API Client connected to Backend Registration & Login Database
 */
export const authApi = {
  async sendOtp(data: {
    mobile?: string;
    email?: string;
    purpose?: "login" | "register";
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    isUnregistered?: boolean;
    isRegistered?: boolean;
    maskedEmail?: string;
    devOtp?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json.message || "Failed to send verification code.",
          isUnregistered: json.isUnregistered,
          isRegistered: json.isRegistered,
        };
      }
      return { success: true, message: json.message, maskedEmail: json.maskedEmail, devOtp: json.devOtp };
    } catch {
      return {
        success: false,
        error: "Unable to connect to verification server. Please check backend connection.",
      };
    }
  },

  async register(data: {
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
    password?: string;
    otp?: string;
    firebaseToken?: string;
  }): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json.message || "Registration failed.",
        };
      }
      return json;
    } catch {
      // Local fallback if API server is temporarily offline
      const cleanMobile = data.mobile.startsWith("+91")
        ? data.mobile
        : `+91${data.mobile.replace(/\D/g, "")}`;
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const localUser: AuthUserResponse = {
        id: `usr_${Date.now()}`,
        name: fullName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || "",
        mobile: cleanMobile,
        role: "customer",
        joinedAt: "Registered Member",
      };
      return { success: true, data: localUser, token: `local_token_${localUser.id}` };
    }
  },

  async login(data: {
    mobile?: string;
    email?: string;
    otp?: string;
    password?: string;
    firebaseToken?: string;
  }): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json.message || "Sign in failed.",
          isUnregistered: json.isUnregistered,
        };
      }
      return json;
    } catch {
      return {
        success: false,
        error: "Unable to connect to server. Please check backend connection.",
      };
    }
  },

  async adminLogin(data: {
    email: string;
    password?: string;
  }): Promise<AuthApiResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json.message || "Admin access denied.",
        };
      }
      return json;
    } catch {
      // Local admin check
      if (
        data.email.trim().toLowerCase() === "admin@trial.com" &&
        data.password === "kunal00700@"
      ) {
        return {
          success: true,
          data: {
            id: "usr_admin_master",
            name: "Studio Administrator",
            firstName: "Studio",
            lastName: "Admin",
            email: "admin@trial.com",
            mobile: "+919999999999",
            role: "admin",
            joinedAt: "Master Admin",
          },
          token: "admin_master_token",
        };
      }
      return { success: false, error: "Invalid admin credentials." };
    }
  },

  async getCustomers(role = "admin"): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/customers`, {
        headers: { "x-role": role },
      });
      if (!ok(res)) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },
};

function ok(res: Response) {
  return res.ok;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
}

export interface CreatePaymentOrderResult {
  success: boolean;
  message?: string;
  order?: RazorpayOrderResponse;
  keyId?: string;
  internalOrderId?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  message?: string;
  data?: {
    orderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    payment_status: string;
  };
}

export const paymentApi = {
  async createOrder(data: {
    amount: number;
    currency?: string;
    items?: any[];
    orderId?: string;
    customer?: { name?: string; email?: string; mobile?: string };
    shippingAddress?: any;
    userId?: string;
  }): Promise<CreatePaymentOrderResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to connect to payment server." };
    }
  },

  async verifyPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    orderId?: string;
  }): Promise<VerifyPaymentResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/payment/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || "Payment verification request failed." };
    }
  },

  async recordFailure(data: {
    orderId?: string;
    razorpay_order_id?: string;
    reason?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/payment/failed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  },
};


