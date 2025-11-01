'use client';
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // Make sure path is correct
import {
  ChevronLeft,
  CheckCircle,
  Edit,
  AlertCircle,
} from "lucide-react";

// Define the Asset type (you can expand this)
type Asset = {
  asset_id: string;
  name: string;
  description: string;
  location_id: string;
  status: string;
  // Add any other fields you fetch
};

export default function ConfirmationContent({
  item,
  tableName,
  onBack,
  onSubmit,
}: {
  item: any;
  tableName: string;
  onBack: () => void;
  onSubmit: (status: string) => Promise<void>;
}) {
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  const [status, setStatus] = useState("in use");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { value: "in use", label: "In Use" },
    { value: "broken", label: "Broken" },
    { value: "in store", label: "In Store" },
  ];

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!item || !item.code || tableName !== "asset") {
        setError("Invalid asset data provided.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select()
          .eq("asset_id", item.code)
          .single();

        if (error) throw new Error("This Asset ID was not found in the database. Please register it first.");
        if (!data) throw new Error("Asset not found in database.");

        setAssetDetails(data as Asset);
        setStatus(data.status || "in use"); // Set current status from DB

      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssetDetails();
  }, [item, tableName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(status);
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-500 text-white">
              <div className="flex items-center gap-3">
                <Edit className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Confirm Asset Status</h1>
                  <p className="text-sm text-red-100">Scanned Code: {item?.code}</p>
                </div>
              </div>
            </div>

            {loading && <div className="p-8 text-center">Loading Asset Details...</div>}
            
            {error && (
              <div className="p-8">
                  <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
                    <strong className="flex items-center justify-center gap-2">
                      <AlertCircle className="w-5 h-5" /> Error
                    </strong>
                    <p>{error}</p>
                  </div>
              </div>
            )}

            {!loading && !error && assetDetails && (
              <div className="p-6 lg:p-8 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Asset Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-lg text-gray-800">{assetDetails.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Asset ID</label>
                      <p className="text-lg text-gray-800 font-mono">{assetDetails.asset_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="text-lg text-gray-800">{assetDetails.description || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Current Location</label>
                      <p className="text-lg text-gray-800">{assetDetails.location_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Scan Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Scanned By</label>
                      <p className="text-lg text-gray-800">John Doe (Hardcoded)</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Department</label>
                      <p className="text-lg text-gray-800">IT (Hardcoded)</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date Scanned</label>
                      <p className="text-lg text-gray-800">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Time Scanned</label>
                      <p className="text-lg text-gray-800">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Update Status</h3>
                  <p className="text-sm text-gray-600">Select the current status for this asset.</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {statusOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          status === option.value
                            ? "border-red-600 bg-red-50 shadow-md"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={option.value}
                          checked={status === option.value}
                          onChange={() => setStatus(option.value)}
                          className="sr-only"
                        />
                        <span className="text-lg font-medium text-gray-800">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-4 lg:px-6 py-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back to Scan
                </button>
                <button
                  type="submit"
                  disabled={loading || !!error}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
                    (loading || !!error)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  Submit Status
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}