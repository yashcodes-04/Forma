import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authApi } from "../api/client";

export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile: string;
  role: UserRole;
  avatar?: string;
  joinedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  isLoading: boolean;
  loginCustomer: (data: {
    mobile?: string;
    otp?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    firebaseToken?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginCustomerWithPassword?: (data: {
    emailOrMobile: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (data: {
    email: string;
    password?: string;
    mobile?: string;
    otp?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (data: {
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
    password?: string;
    otp?: string;
    firebaseToken?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const USER_STORAGE_KEY = "forma_active_user";
const LEGACY_USER_KEY = "formaUser";
const LEGACY_ADMIN_KEY = "formaAdminAuthenticated";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      // Check primary rich user storage
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        if (parsed && parsed.id && parsed.role) {
          return parsed;
        }
      }

      // Check legacy customer session if valid
      const legacyUser = localStorage.getItem(LEGACY_USER_KEY);
      if (legacyUser) {
        const parsed = JSON.parse(legacyUser);
        if (parsed && parsed.mobile) {
          const fullName = [parsed.firstName, parsed.lastName].filter(Boolean).join(" ") || "Forma Member";
          return {
            id: `usr_${Date.now()}`,
            name: fullName,
            firstName: parsed.firstName || "Member",
            lastName: parsed.lastName || "",
            mobile: parsed.mobile,
            email: parsed.email || "",
            role: "customer",
            joinedAt: "Verified Member",
          };
        }
      }
    } catch {
      // ignore parsing error
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync state with storage and handle cross-tab events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_STORAGE_KEY || e.key === LEGACY_USER_KEY || e.key === LEGACY_ADMIN_KEY) {
        try {
          const stored = localStorage.getItem(USER_STORAGE_KEY);
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const persistUser = (nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      if (nextUser.role === "admin") {
        localStorage.setItem(LEGACY_ADMIN_KEY, "true");
        localStorage.removeItem(LEGACY_USER_KEY);
      } else {
        localStorage.removeItem(LEGACY_ADMIN_KEY);
        localStorage.setItem(
          LEGACY_USER_KEY,
          JSON.stringify({
            mobile: nextUser.mobile,
            firstName: nextUser.firstName || nextUser.name.split(" ")[0] || "",
            lastName: nextUser.lastName || nextUser.name.split(" ")[1] || "",
            email: nextUser.email || "",
          })
        );
      }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      localStorage.removeItem(LEGACY_ADMIN_KEY);
    }
  };

  const loginCustomer = async ({
    mobile,
    otp,
    email,
    password,
    firebaseToken,
  }: {
    mobile?: string;
    otp?: string;
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    firebaseToken?: string;
  }) => {
    setIsLoading(true);

    try {
      const res = await authApi.login({ mobile, email, otp, password, firebaseToken });

      if (res.success && res.data) {
        persistUser(res.data as User);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return {
        success: false,
        error: res.error || "Sign in failed. Only registered accounts can log in.",
      };
    } catch {
      setIsLoading(false);
      return {
        success: false,
        error: "Unable to complete sign in. Please verify your connection.",
      };
    }
  };

  const loginAdmin = async ({
    email,
    password,
  }: {
    email: string;
    password?: string;
    mobile?: string;
    otp?: string;
  }) => {
    setIsLoading(true);

    try {
      const res = await authApi.adminLogin({ email, password });

      if (res.success && res.data) {
        persistUser(res.data as User);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return {
        success: false,
        error: res.error || "Invalid administrator credentials. Access denied.",
      };
    } catch {
      setIsLoading(false);
      return {
        success: false,
        error: "Administrator authentication failed.",
      };
    }
  };

  const registerCustomer = async (data: {
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
    password?: string;
    otp?: string;
  }) => {
    setIsLoading(true);

    try {
      const res = await authApi.register(data);

      if (res.success && res.data) {
        persistUser(res.data as User);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return {
        success: false,
        error: res.error || "Registration failed. Please check your information.",
      };
    } catch {
      setIsLoading(false);
      return {
        success: false,
        error: "Registration failed due to connection error.",
      };
    }
  };

  const logout = () => {
    persistUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    persistUser(updated);
  };

  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(user && user.role === "admin");
  const isCustomer = Boolean(user && user.role === "customer");

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated,
        isAdmin,
        isCustomer,
        isLoading,
        loginCustomer,
        loginAdmin,
        registerCustomer,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
