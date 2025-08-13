import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  companyId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role?: string;
  companyId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing tokens on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedTokens = localStorage.getItem("auth_tokens");
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens);
          setTokens(parsedTokens);

          // Try to get user profile
          await refreshAuth();
        }
      } catch (error) {
        console.error("Failed to restore authentication:", error);
        localStorage.removeItem("auth_tokens");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      if (data.success && data.data) {
        setUser(data.data.user);
        setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });

        // Store tokens in localStorage
        localStorage.setItem(
          "auth_tokens",
          JSON.stringify({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
        );
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();

      if (data.success && data.data) {
        setUser(data.data.user);
        setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });

        // Store tokens in localStorage
        localStorage.setItem(
          "auth_tokens",
          JSON.stringify({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
        );
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("auth_tokens");

    // Call logout endpoint if we have tokens
    if (tokens?.refreshToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      }).catch(console.error);
    }
  };

  const refreshAuth = async () => {
    if (!tokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const data = await response.json();

      if (data.success && data.data) {
        setUser(data.data.user);
        setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });

        // Update stored tokens
        localStorage.setItem(
          "auth_tokens",
          JSON.stringify({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
        );
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout(); // Clear invalid tokens
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
