import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api, API_ENDPOINTS } from "../config/api";

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
  getAccessToken: () => string | null;
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
        // Check for both token formats for compatibility
        const storedTokens = localStorage.getItem("auth_tokens");
        const legacyToken = localStorage.getItem("token");

        // Debug logging
        console.log("checkAuth - storedTokens:", storedTokens);
        console.log("checkAuth - legacyToken:", legacyToken);

        if (storedTokens) {
          try {
            const parsedTokens = JSON.parse(storedTokens);
            setTokens(parsedTokens);

            // Try to get user profile with stored token
            try {
              const userData = await api.get<any>(
                API_ENDPOINTS.AUTH.PROFILE,
                parsedTokens.accessToken
              );
              if (userData.success && userData.data) {
                setUser(userData.data);
              } else {
                // If profile fetch fails, try refresh
                try {
                  await refreshAuth();
                } catch (refreshError) {
                  console.error(
                    "Profile fetch and refresh both failed:",
                    refreshError
                  );
                  // Clear invalid tokens
                  localStorage.removeItem("auth_tokens");
                  localStorage.removeItem("token");
                }
              }
            } catch (error) {
              // If profile fetch fails, try refresh
              try {
                await refreshAuth();
              } catch (refreshError) {
                console.error(
                  "Profile fetch and refresh both failed:",
                  refreshError
                );
                // Clear invalid tokens
                localStorage.removeItem("auth_tokens");
                localStorage.removeItem("token");
              }
            }
          } catch (error) {
            console.error("Failed to validate stored tokens:", error);
            // If validation fails, try refresh
            try {
              await refreshAuth();
            } catch (refreshError) {
              console.error("Refresh also failed:", refreshError);
              localStorage.removeItem("auth_tokens");
              localStorage.removeItem("token");
            }
          }
        } else if (legacyToken) {
          // If we only have the legacy token, try to get user info
          try {
            const userData = await api.get<any>(
              API_ENDPOINTS.AUTH.PROFILE,
              legacyToken
            );
            if (userData.success && userData.data) {
              setUser(userData.data);
              setTokens({
                accessToken: legacyToken,
                refreshToken: "", // We don't have refresh token in legacy format
              });
            } else {
              // Invalid legacy token, remove it
              localStorage.removeItem("token");
            }
          } catch (error) {
            console.error("Failed to validate legacy token:", error);
            localStorage.removeItem("token");
          }
        }
      } catch (error) {
        console.error("Failed to restore authentication:", error);
        localStorage.removeItem("auth_tokens");
        localStorage.removeItem("token");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      const data = await api.post<any>(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });

      if (data.success && data.data) {
        setUser(data.data.user);
        setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });

        // Store tokens in localStorage (also store as "token" for compatibility)
        localStorage.setItem(
          "auth_tokens",
          JSON.stringify({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
        );
        localStorage.setItem("token", data.data.accessToken);
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

      const data = await api.post<any>(API_ENDPOINTS.AUTH.REGISTER, userData);

      if (data.success && data.data) {
        setUser(data.data.user);
        setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });

        // Store tokens in localStorage (also store as "token" for compatibility)
        localStorage.setItem(
          "auth_tokens",
          JSON.stringify({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
        );
        localStorage.setItem("token", data.data.accessToken);
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
    localStorage.removeItem("token");

    // Call logout endpoint if we have tokens
    if (tokens?.refreshToken) {
      api
        .post(
          API_ENDPOINTS.AUTH.LOGOUT,
          { refreshToken: tokens.refreshToken },
          tokens.accessToken
        )
        .catch(console.error);
    }
  };

  const refreshAuth = async () => {
    if (!tokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const data = await api.post<any>(API_ENDPOINTS.AUTH.REFRESH, {
        refreshToken: tokens.refreshToken,
      });

      if (data.success && data.data) {
        setUser(data.data.user);
        setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });

        // Update stored tokens (also update "token" for compatibility)
        localStorage.setItem(
          "auth_tokens",
          JSON.stringify({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          })
        );
        localStorage.setItem("token", data.data.accessToken);
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Don't call logout here to prevent infinite loops
      // Just clear the tokens from state
      setTokens(null);
      setUser(null);
      localStorage.removeItem("auth_tokens");
      localStorage.removeItem("token");
      throw error;
    }
  };

  const getAccessToken = (): string | null => {
    // Debug logging
    console.log("getAccessToken called - tokens state:", tokens);

    // First try to get from state
    if (tokens?.accessToken && tokens.accessToken !== "null") {
      console.log("getAccessToken returning from state:", tokens.accessToken);
      return tokens.accessToken;
    }

    // Fallback to localStorage
    const storedToken = localStorage.getItem("token");
    console.log("getAccessToken - storedToken from localStorage:", storedToken);
    if (storedToken && storedToken !== "null" && storedToken !== "undefined") {
      console.log(
        "getAccessToken returning from localStorage token:",
        storedToken
      );
      return storedToken;
    }

    // Try to get from auth_tokens
    const storedTokens = localStorage.getItem("auth_tokens");
    console.log(
      "getAccessToken - storedTokens from localStorage:",
      storedTokens
    );
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens);
        if (
          parsedTokens.accessToken &&
          parsedTokens.accessToken !== "null" &&
          parsedTokens.accessToken !== "undefined"
        ) {
          console.log(
            "getAccessToken returning from auth_tokens:",
            parsedTokens.accessToken
          );
          return parsedTokens.accessToken;
        }
      } catch (error) {
        console.error("Error parsing stored tokens:", error);
      }
    }

    console.log("getAccessToken returning null");
    return null;
  };

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user || (!!tokens && !!getAccessToken()),
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
    getAccessToken,
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
