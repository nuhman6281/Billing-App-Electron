import React, { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Upload, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  X,
  Database,
  Users,
  Building2,
  Receipt,
  FileText as FileTextIcon
} from "lucide-react";

interface ImportData {
  type: "customers" | "vendors" | "invoices" | "bills" | "chart-of-accounts";
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
  preview: any[];
}

interface ExportData {
  type: "customers" | "vendors" | "invoices" | "bills" | "chart-of-accounts";
  format: "csv" | "excel";
  filters: Record<string, any>;
  dateRange: {
    start: string;
    end: string;
  };
}

const dataTypes = [
  { 
    value: "customers", 
    label: "Customers", 
    icon: Users, 
    description: "Import/export customer data",
    fields: ["name", "email", "phone", "address", "company"]
  },
  { 
    value: "vendors", 
    label: "Vendors", 
    icon: Building2, 
    description: "Import/export vendor data",
    fields: ["name", "email", "phone", "address", "company"]
  },
  { 
    value: "invoices", 
    label: "Invoices", 
    icon: Receipt, 
    description: "Import/export invoice data",
    fields: ["number", "date", "customer", "amount", "status"]
  },
  { 
    value: "bills", 
    label: "Bills", 
    icon: FileTextIcon, 
    description: "Import/export bill data",
    fields: ["number", "date", "vendor", "amount", "status"]
  },
  { 
    value: "chart-of-accounts", 
    label: "Chart of Accounts", 
    icon: Database, 
    description: "Import/export account data",
    fields: ["code", "name", "type", "category", "parent"]
  }
];

export default function DataImportExport() {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [selectedDataType, setSelectedDataType] = useState<string>("customers");
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [exportData, setExportData] = useState<ExportData>({
    type: "customers",
    format: "csv",
    filters: {},
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  });
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedDataType);

      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/data/import/validate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setImportData(data);
      } else {
        throw new Error("Failed to validate file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload and validate file");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    try {
      setIsImporting(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/data/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedDataType,
          fileName: importData.fileName,
          data: importData.preview
        }),
      });

      if (response.ok) {
        setSuccess(`Successfully imported ${importData.validRows} records`);
        setImportData(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        throw new Error("Failed to import data");
      }
    } catch (error) {
      console.error("Error importing data:", error);
      setError("Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/data/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportData.type}-${exportData.format}-${new Date().toISOString().split('T')[0]}.${exportData.format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        setSuccess(`Successfully exported ${exportData.type} data`);
      } else {
        throw new Error("Failed to export data");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/data/template?type=${selectedDataType}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedDataType}-template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      setError("Failed to download template");
    }
  };

  const getDataTypeIcon = (type: string) => {
    const dataType = dataTypes.find(dt => dt.value === type);
    if (!dataType) return Database;
    return dataType.icon;
  };

  const getDataTypeLabel = (type: string) => {
    const dataType = dataTypes.find(dt => dt.value === type);
    return dataType?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Import & Export</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import data from external sources and export your business data
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("import")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "import"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Import Data
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "export"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Download className="h-4 w-4 inline mr-2" />
            Export Data
          </button>
        </nav>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Data Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Data Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataTypes.map((dataType) => {
              const Icon = dataType.icon;
              return (
                <button
                  key={dataType.value}
                  onClick={() => setSelectedDataType(dataType.value)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedDataType === dataType.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-6 w-6 text-gray-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{dataType.label}</h3>
                      <p className="text-sm text-gray-500">{dataType.description}</p>
                    </div>
                  </div>
                  {selectedDataType === dataType.value && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Fields:</strong> {dataType.fields.join(", ")}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Import Tab */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import {getDataTypeLabel(selectedDataType)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    disabled={isImporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Supported formats: CSV, Excel (.xlsx, .xls). Max file size: 10MB
                </p>
              </div>

              {isImporting && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Processing file...</span>
                </div>
              )}

              {importData && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">File Validation Results</h4>
                    <Badge variant={importData.invalidRows === 0 ? "default" : "destructive"}>
                      {importData.invalidRows === 0 ? "Valid" : "Has Errors"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">File:</span>
                      <p className="font-medium">{importData.fileName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Rows:</span>
                      <p className="font-medium">{importData.totalRows}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Valid Rows:</span>
                      <p className="font-medium text-green-600">{importData.validRows}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Invalid Rows:</span>
                      <p className="font-medium text-red-600">{importData.invalidRows}</p>
                    </div>
                  </div>

                  {importData.errors.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-900 mb-2">Validation Errors:</h5>
                      <div className="space-y-1">
                        {importData.errors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-sm text-red-600">• {error}</p>
                        ))}
                        {importData.errors.length > 5 && (
                          <p className="text-sm text-gray-500">
                            ... and {importData.errors.length - 5} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {importData.preview.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Data Preview:</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              {Object.keys(importData.preview[0]).map((key) => (
                                <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {importData.preview.slice(0, 5).map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value, valueIndex) => (
                                  <td key={valueIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setImportData(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={importData.invalidRows > 0}
                    >
                      Import {importData.validRows} Records
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === "export" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export {getDataTypeLabel(selectedDataType)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <select
                    value={exportData.format}
                    onChange={(e) => setExportData({ ...exportData, format: e.target.value as "csv" | "excel" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="csv">CSV</option>
                    <option value="excel">Excel (.xlsx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={exportData.dateRange.start}
                      onChange={(e) => setExportData({
                        ...exportData,
                        dateRange: { ...exportData.dateRange, start: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={exportData.dateRange.end}
                      onChange={(e) => setExportData({
                        ...exportData,
                        dateRange: { ...exportData.dateRange, end: e.target.value }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import/Export Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Import Tips:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use the provided templates for correct formatting</li>
                <li>• Ensure all required fields are filled</li>
                <li>• Check data types (dates, numbers, text)</li>
                <li>• Remove any empty rows or columns</li>
                <li>• Maximum file size: 10MB</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Export Features:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Choose between CSV and Excel formats</li>
                <li>• Filter by date ranges</li>
                <li>• Include all related data</li>
                <li>• Automatic file naming</li>
                <li>• Secure data handling</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
