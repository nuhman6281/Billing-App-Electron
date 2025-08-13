import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import Bills from "./components/Bills";
import { Login } from "./components/Login";
import { useAppStore } from "./stores/appStore";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Extend Window interface for electronAPI
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppName: () => Promise<string>;
      storeGet: (key: string) => Promise<any>;
      storeSet: (key: string, value: any) => Promise<void>;
      storeDelete: (key: string) => Promise<void>;
      showOpenDialog: (options: any) => Promise<any>;
      showSaveDialog: (options: any) => Promise<any>;
      showMessageBox: (options: any) => Promise<any>;
      onMenuAction: (callback: (action: string) => void) => void;
      onMainProcessMessage: (callback: (message: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

function AppContent(): React.ReactElement {
  const { setAppInfo, setMenuAction } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if we're running in Electron
        if (window.electronAPI) {
          // Get app information
          const version = await window.electronAPI.getAppVersion();
          const name = await window.electronAPI.getAppName();

          setAppInfo({ name, version });

          // Set up menu action listener
          window.electronAPI.onMenuAction((action) => {
            setMenuAction(action);
          });

          // Set up main process message listener
          window.electronAPI.onMainProcessMessage((message) => {
            console.log("Main process message:", message);
          });
        } else {
          // Running in web browser - set default values
          setAppInfo({
            name: "Billing & Accounting App (Web)",
            version: "1.0.0",
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        // Set default values on error
        setAppInfo({
          name: "Billing & Accounting App",
          version: "1.0.0",
        });
        setIsLoading(false);
      }
    };

    initializeApp();

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners("menu-action");
        window.electronAPI.removeAllListeners("main-process-message");
      }
    };
  }, [setAppInfo, setMenuAction]);

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

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bills" element={<Bills />} />
      </Routes>
    </Layout>
  );
}

function App(): React.ReactElement {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
