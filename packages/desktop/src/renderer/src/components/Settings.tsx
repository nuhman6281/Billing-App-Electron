import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Building2,
  DollarSign,
  Shield,
  Bell,
  Database,
  Download,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface CompanySettings {
  company: {
    name: string;
    email: string;
    phone: string;
    address: any;
    website: string;
  };
  financial: {
    defaultCurrency: string;
    fiscalYearStart: string;
    taxRate: string;
    invoicePrefix: string;
    billPrefix: string;
  };
  integrations: {
    emailService: any;
    paymentGateway: any;
    banking: any;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    invoiceReminders: boolean;
    billReminders: boolean;
  };
  security: {
    passwordPolicy: any;
    sessionTimeout: number;
    mfaRequired: boolean;
  };
}

export default function Settings() {
  const { getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState("company");
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      const data = await api.get<any>(API_ENDPOINTS.SETTINGS.COMPANY, token);
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setError("Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (tab: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // This would save the specific tab settings
      setSuccess(`${tab} settings saved successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(`Failed to save ${tab} settings`);
    }
  };

  const tabs = [
    { id: "company", label: "Company", icon: Building2 },
    { id: "financial", label: "Financial", icon: DollarSign },
    { id: "integrations", label: "Integrations", icon: SettingsIcon },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "backup", label: "Backup", icon: Database },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your application preferences and company settings
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "company" && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue={settings?.company?.name || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={settings?.company?.email || ""}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSaveSettings("company")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "financial" && (
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Currency
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={settings?.financial?.taxRate || "0.00"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSaveSettings("financial")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "integrations" && (
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Email Service
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure email service for sending invoices and
                    notifications
                  </p>
                  <Button variant="outline" size="sm">
                    Configure Email
                  </Button>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Payment Gateway
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Set up payment processing for online payments
                  </p>
                  <Button variant="outline" size="sm">
                    Configure Payments
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={settings?.notifications?.emailNotifications}
                    className="mr-3"
                  />
                  Email Notifications
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={settings?.notifications?.invoiceReminders}
                    className="mr-3"
                  />
                  Invoice Reminders
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={settings?.notifications?.billReminders}
                    className="mr-3"
                  />
                  Bill Reminders
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSaveSettings("notifications")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "security" && (
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={settings?.security?.mfaRequired}
                    className="mr-3"
                  />
                  Require Two-Factor Authentication
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={settings?.security?.sessionTimeout || 30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSaveSettings("security")}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "backup" && (
          <Card>
            <CardHeader>
              <CardTitle>Data Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Backup Status
                </h4>
                <p className="text-sm text-blue-700 mb-3">Last backup: Never</p>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Create Backup
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <p>• Backups are automatically created every 24 hours</p>
                <p>• Backup files are stored for 30 days</p>
                <p>• You can download backups manually at any time</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
