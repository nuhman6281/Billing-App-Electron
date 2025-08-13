import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Login } from "./Login";

interface AuthenticationWrapperProps {
  children: React.ReactNode;
}

export const AuthenticationWrapper: React.FC<AuthenticationWrapperProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Loading Billing & Accounting App...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
};
