import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Edit, Trash2, Eye, Save, X, AlertCircle } from "lucide-react";

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  reference: string;
  description: string;
  status: "DRAFT" | "POSTED" | "VOIDED";
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
  postedAt?: string;
  postedBy?: string;
  items: JournalEntryItem[];
  createdAt: string;
  updatedAt: string;
}

interface JournalEntryItem {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description?: string;
}

interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface JournalEntryStats {
  totalEntries: number;
  draftEntries: number;
  postedEntries: number;
  voidedEntries: number;
  totalDebits: string;
  totalCredits: string;
  unbalancedEntries: number;
}

export default function JournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [stats, setStats] = useState<JournalEntryStats>({
    totalEntries: 0,
    draftEntries: 0,
    postedEntries: 0,
    voidedEntries: 0,
    totalDebits: "0.00",
    totalCredits: "0.00",
    unbalancedEntries: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: "",
    description: "",
    items: [
      { accountId: "", debit: "", credit: "", description: "" },
      { accountId: "", debit: "", credit: "", description: "" }
    ] as JournalEntryItem[]
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
    fetchStats();
  }, []);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/journal-entries", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      } else {
        throw new Error("Failed to fetch entries");
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
      setError("Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/chart-of-accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/api/journal-entries/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.date) errors.push("Date is required");
    if (!formData.reference) errors.push("Reference is required");
    if (!formData.description) errors.push("Description is required");
    
    // Check if items have accounts
    formData.items.forEach((item, index) => {
      if (!item.accountId) {
        errors.push(`Account is required for line ${index + 1}`);
      }
    });
    
    // Check if at least one debit and one credit
    const hasDebit = formData.items.some(item => parseFloat(item.debit) > 0);
    const hasCredit = formData.items.some(item => parseFloat(item.credit) > 0);
    
    if (!hasDebit) errors.push("At least one debit amount is required");
    if (!hasCredit) errors.push("At least one credit amount is required");
    
    // Check if balanced
    const totalDebit = formData.items.reduce((sum, item) => sum + parseFloat(item.debit || "0"), 0);
    const totalCredit = formData.items.reduce((sum, item) => sum + parseFloat(item.credit || "0"), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push("Total debits must equal total credits");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingEntry
        ? `http://localhost:3001/api/journal-entries/${editingEntry.id}`
        : "http://localhost:3001/api/journal-entries";
      
      const method = editingEntry ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingEntry(null);
        resetForm();
        fetchEntries();
        fetchStats();
      } else {
        throw new Error("Failed to save entry");
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      setError("Failed to save journal entry");
    }
  };

  const handlePost = async (entryId: string) => {
    if (!confirm("Are you sure you want to post this journal entry? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/journal-entries/${entryId}/post`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchEntries();
        fetchStats();
      } else {
        throw new Error("Failed to post entry");
      }
    } catch (error) {
      console.error("Error posting entry:", error);
      setError("Failed to post journal entry");
    }
  };

  const handleVoid = async (entryId: string) => {
    if (!confirm("Are you sure you want to void this journal entry? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/journal-entries/${entryId}/void`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchEntries();
        fetchStats();
      } else {
        throw new Error("Failed to void entry");
      }
    } catch (error) {
      console.error("Error voiding entry:", error);
      setError("Failed to void journal entry");
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this journal entry?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/api/journal-entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchEntries();
        fetchStats();
      } else {
        throw new Error("Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      setError("Failed to delete journal entry");
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      reference: entry.reference,
      description: entry.description,
      items: entry.items.map(item => ({
        accountId: item.accountId,
        debit: item.debit,
        credit: item.credit,
        description: item.description || ""
      }))
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      reference: "",
      description: "",
      items: [
        { accountId: "", debit: "", credit: "", description: "" },
        { accountId: "", debit: "", credit: "", description: "" }
      ]
    });
    setValidationErrors([]);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { accountId: "", debit: "", credit: "", description: "" }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 2) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const updateItem = (index: number, field: keyof JournalEntryItem, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { variant: "secondary", text: "Draft" },
      POSTED: { variant: "default", text: "Posted" },
      VOIDED: { variant: "destructive", text: "Voided" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    return <Badge variant={config.variant as any}>{config.text}</Badge>;
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || entry.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your double-entry bookkeeping transactions
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalEntries}</div>
            <p className="text-xs text-gray-500">
              {stats.draftEntries} draft, {stats.postedEntries} posted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${parseFloat(stats.totalDebits).toFixed(2)}</div>
            <p className="text-xs text-gray-500">All debit amounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${parseFloat(stats.totalCredits).toFixed(2)}</div>
            <p className="text-xs text-gray-500">All credit amounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unbalanced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unbalancedEntries}</div>
            <p className="text-xs text-gray-500">Entries out of balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No journal entries found. {searchTerm || filterStatus ? "Try adjusting your filters." : "Create your first entry to get started."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map(entry => (
                <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm text-gray-600">{entry.entryNumber}</span>
                      <span className="font-medium">{entry.reference}</span>
                      {getStatusBadge(entry.status)}
                      {!entry.isBalanced && (
                        <Badge variant="destructive">Unbalanced</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{entry.date}</span>
                      <div className="flex space-x-1">
                        {entry.status === "DRAFT" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePost(entry.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {entry.status === "POSTED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVoid(entry.id)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{entry.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Debits</h4>
                      <div className="space-y-1">
                        {entry.items.filter(item => parseFloat(item.debit) > 0).map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.accountCode} - {item.accountName}</span>
                            <span className="font-medium text-green-600">${parseFloat(item.debit).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Credits</h4>
                      <div className="space-y-1">
                        {entry.items.filter(item => parseFloat(item.credit) > 0).map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.accountCode} - {item.accountName}</span>
                            <span className="font-medium text-blue-600">${parseFloat(item.credit).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Debits: ${parseFloat(entry.totalDebit).toFixed(2)}</span>
                      <span>Total Credits: ${parseFloat(entry.totalCredit).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingEntry ? "Edit Journal Entry" : "New Journal Entry"}
            </h2>
            
            {validationErrors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Please fix the following errors:</span>
                </div>
                <ul className="list-disc list-inside text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., INV-001, BILL-002"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <input
                    type="text"
                    value={editingEntry ? editingEntry.status : "DRAFT"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief description of the transaction"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">Transaction Lines</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-4">
                        <select
                          value={item.accountId}
                          onChange={(e) => updateItem(index, "accountId", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Account</option>
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.debit}
                          onChange={(e) => updateItem(index, "debit", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.credit}
                          onChange={(e) => updateItem(index, "credit", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Line description (optional)"
                        />
                      </div>
                      
                      <div className="col-span-1">
                        {formData.items.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Debits: </span>
                      <span className="font-mono text-green-600">
                        ${formData.items.reduce((sum, item) => sum + parseFloat(item.debit || "0"), 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Total Credits: </span>
                      <span className="font-mono text-blue-600">
                        ${formData.items.reduce((sum, item) => sum + parseFloat(item.credit || "0"), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {Math.abs(
                    formData.items.reduce((sum, item) => sum + parseFloat(item.debit || "0"), 0) -
                    formData.items.reduce((sum, item) => sum + parseFloat(item.credit || "0"), 0)
                  ) > 0.01 && (
                    <div className="mt-2 text-red-600 text-sm font-medium">
                      ⚠️ Entries are not balanced
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingEntry(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEntry ? "Update" : "Create"} Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
