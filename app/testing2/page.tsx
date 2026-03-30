'use client';
import React, { useState, useEffect, useRef } from "react";
import { Database } from '@/lib/supabase/types';
import { supabase } from "@/lib/supabase/client";
import type { AiAssessmentResult } from '@/lib/supabase/types';
import {
  ChevronLeft,
  CheckCircle,
  Edit,
  AlertCircle,
  Save,
  PackagePlus,
  MapPin,
  Building2,
  Sparkles,
  PenLine,
  Upload,
  RefreshCw,
} from "lucide-react";


// ── Word helpers ─────────────────────────────────────────────────────────────
const FEEDBACK_MAX_WORDS = 50;
function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}
function sanitizeFeedback(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9\s.,!?;:()'"-]/g, '');
}
function truncateToWords(text: string | null | undefined, maxWords: number): string {
  if (!text) return '';
  return text.trim().split(/\s+/).slice(0, maxWords).join(' ');
}

type ConditionStatus = 'In-use' | 'In-store' | 'Spoiled';
type PriorityLevel = 'none' | 'low' | 'medium' | 'high';
const conditionOptions: ConditionStatus[] = ['In-use', 'In-store', 'Spoiled'];

type Asset = {
  asset_id: string; name: string; description: string;
  location_id: string; department_id: string;
  condition: string; category: string; model: string;
};
type Department = Database['public']['Tables']['Department']['Row'];
type Location = Database['public']['Tables']['Location']['Row'];

export default function ConfirmationContent({
  item,
  tableName,
  onBack,
  onSubmit,
  onCreate,
  parentScan,
}: {
  item: any;
  tableName: string;
  onBack: () => void;
  onSubmit: (data: {
    condition: string,
    location_id: string | null,
    department_id: string | null,
    name: string, category: string, model: string, asset_id: string
  }) => Promise<void>;
  onCreate: (data: {
    name: string, description: string, condition: string,
    location_id: string | null, department_id: string | null,
    category: string, model: string
  }) => Promise<void>;
  parentScan: { type: string, id: string, name: string } | null;
}) {
  const [mode, setMode] = useState<'loading' | 'editing' | 'registering' | 'error'>('loading');
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);

  // Two-step flow for editing mode
  const [pageStep, setPageStep] = useState<'confirm' | 'update'>('confirm');

  // Registering fields
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newModel, setNewModel] = useState('');

  const [condition, setCondition] = useState("In-use");
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Manual update fields
  const [maintenanceNeeded, setMaintenanceNeeded] = useState<boolean>(false);
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [feedback, setFeedback] = useState('');

  // Image / AI states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const manualErrorRef = useRef<HTMLDivElement>(null);
  const aiErrorRef = useRef<HTMLDivElement>(null);

  // Update mode (manual vs AI)
  const [updateMode, setUpdateMode] = useState<'manual' | 'ai'>('manual');

  // AI assessment state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiAssessmentResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [aiSubmitError, setAiSubmitError] = useState<string | null>(null);

  const priorityColors: Record<PriorityLevel, { bg: string; border: string; text: string }> = {
    high: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
    medium: { bg: '#fff7ed', border: '#fdba74', text: '#ea580c' },
    low:  { bg: '#fefce8', border: '#fde047', text: '#ca8a04' },
    none: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) || file.size > 10 * 1024 * 1024) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => { setImageFile(null); setImagePreview(''); };
  const resetAi = () => { setAiResult(null); setAiError(''); clearImage(); };

  // ── AI Analysis ────────────────────────────────────────────────────────────
  const handleAiAnalyze = async () => {
    if (!imageFile) return;
    if (!selectedLocation) {
      setAiError('Please select a location before analyzing.');
      return;
    }
    if (!selectedDepartment) {
      setAiError('Please select a department before analyzing.');
      return;
    }
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const response = await fetch('/api/assessAsset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, assetId: item.code, locationId: selectedLocation, userId: null, mimeType: imageFile.type }),
      });
      const data = await response.json();
      if (data.success) { setAiResult(data.assessment); }
      else { setAiError(data.detail || data.error || 'Assessment failed'); }
    } catch { setAiError('Failed to assess asset. Check console for details.'); }
    finally { setAiLoading(false); }
  };

  // ── Shared image upload section ────────────────────────────────────────────
  const renderImageSection = (required = false) => (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        Asset Photo {required ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
      </label>
      {!imageFile && (
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e5e7eb', borderRadius: 12, padding: '20px', cursor: 'pointer', background: '#fafafa', gap: 8 }}>
          <Upload size={28} color="#9ca3af" />
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Click to upload</span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>JPEG, PNG, WebP (max 10MB)</span>
          <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
        </label>
      )}
      {imageFile && imagePreview && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain" />
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs text-gray-600">{imageFile.name} • {(imageFile.size / 1024).toFixed(1)} KB</span>
            <button type="button" onClick={clearImage} className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
          </div>
        </div>
      )}
    </div>
  );

  // Data fetching
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const { data: locData } = await supabase.from('Location').select('*');
        setLocations(locData || []);
        const { data: deptData } = await supabase.from('Department').select('*');
        setDepartments(deptData || []);
      } catch (err: any) {
        console.error("Error fetching dropdown data:", err);
      }
    };

    const fetchAssetDetails = async () => {
      if (!item || !item.code) {
        setMode('error');
        setError("Invalid asset data provided.");
        return;
      }
      setMode('loading');
      setError(null);
      await fetchDropdownData();

      try {
        const { data, error } = await supabase
          .from(tableName as "Asset" | "Location" | "Department" | "Staff" | "StaffAsset" | "Sessions" | "Maintenance")
          .select()
          .eq("asset_id", item.code)
          .single();

        if (error && error.code === 'PGRST116') {
          setMode('registering');
          setCondition('In-use');
        } else if (error) {
          throw error;
        } else if (data) {
          const typedData = data as Asset;
          setAssetDetails(typedData);
          setCondition(typedData.condition || "In-use");
          setSelectedLocation(typedData.location_id || '');
          setSelectedDepartment(typedData.department_id || '');
          setMode('editing');
        }
      } catch (err: any) {
        setMode('error');
        setError(err.message || "An unknown error occurred.");
      }
    };

    fetchAssetDetails();
  }, [item, tableName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'editing') {
      // Validation for manual mode
      if (updateMode === 'manual') {
        setManualError(null); setAiSubmitError(null);
        if (!selectedLocation) { setManualError('Please select a location before submitting.'); setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
        if (!selectedDepartment) { setManualError('Please select a department before submitting.'); setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
        if (maintenanceNeeded) {
          if (priority === 'none') { setManualError('Please select a priority level since maintenance is needed.'); setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
          if (!feedback.trim()) { setManualError('Please enter staff feedback before submitting.'); setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
          if (!imageFile) { setManualError('Please upload a photo since maintenance is needed.'); setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
        }
      }
      onSubmit({
        condition,
        location_id: selectedLocation || null,
        department_id: selectedDepartment || null,
        name: assetDetails?.name || 'N/A',
        category: assetDetails?.category || 'N/A',
        model: assetDetails?.model || 'N/A',
        asset_id: assetDetails?.asset_id || item.code
      });
    } else if (mode === 'registering') {
      if (!newName || !newCategory || !newModel) {
        alert("Please fill in all required fields: Asset Name, Category, and Model.");
        return;
      }
      onCreate({
        name: newName,
        description: newDescription,
        condition,
        location_id: selectedLocation || null,
        department_id: selectedDepartment || null,
        category: newCategory,
        model: newModel
      });
    }
  };

  // ── Helpers ──────────────────────────────────────────────
  const getConditionBadge = (cond: string) => {
    const base = "px-3 py-1 rounded-full text-sm font-bold";
    if (cond === 'In-use') return `${base} bg-green-100 text-green-800 border border-green-300`;
    if (cond === 'Spoiled') return `${base} bg-red-100 text-red-800 border border-red-300`;
    return `${base} bg-yellow-100 text-yellow-800 border border-yellow-300`;
  };

  // ── STEP 1: Confirm — read-only details ──────────────────
  const renderConfirmStep = () => {
    const locationName = locations.find(l => l.location_id === assetDetails?.location_id)?.name
      || assetDetails?.location_id || '—';
    const deptName = departments.find(d => d.department_id === assetDetails?.department_id)?.name
      || assetDetails?.department_id || '—';

    return (
      <div className="p-6 lg:p-8 space-y-6">
        {/* Asset Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Asset Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-base text-gray-800 mt-0.5">{assetDetails?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Asset ID</p>
              <p className="text-base text-gray-800 font-mono mt-0.5">{assetDetails?.asset_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p className="text-base text-gray-800 mt-0.5">{assetDetails?.category || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Model</p>
              <p className="text-base text-gray-800 mt-0.5">{assetDetails?.model || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Location Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p className="text-base text-gray-800 mt-0.5">{locationName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="text-base text-gray-800 mt-0.5">{deptName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Condition */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Current Condition:</span>
          <span className={getConditionBadge(assetDetails?.condition || 'In-use')}>
            {assetDetails?.condition || 'In-use'}
          </span>
        </div>
      </div>
    );
  };

  // ── STEP 2: Update — new flow with Manual + AI Gemini ──────
  const renderUpdateStep = () => (
    <div className="p-4 space-y-4">

      {/* Update Location & Department */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" /> Update Location
          </h3>
          {aiLoading && (
            <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-300 px-2 py-1 rounded-full font-medium">
              🔒 Locked during analysis
            </span>
          )}
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
              <MapPin className="w-4 h-4" /> Location <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              disabled={aiLoading}
              className={`w-full p-3 border-2 rounded-lg focus:outline-none text-gray-800 ${aiLoading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 focus:border-red-500'}`}
            >
              <option value="">-- None --</option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1 mb-1">
              <Building2 className="w-4 h-4" /> Department <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              disabled={aiLoading}
              className={`w-full p-3 border-2 rounded-lg focus:outline-none text-gray-800 ${aiLoading ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 focus:border-red-500'}`}
            >
              <option value="">-- None --</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Unified validation error banner */}
      {(manualError || aiSubmitError || aiError) && (
        <div ref={aiErrorRef} className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-lg text-sm font-medium">
          ⚠ {manualError || aiSubmitError || aiError}
        </div>
      )}

      {/* Asset Condition — Manual / AI toggle */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Asset Condition</h3>
          <div style={{ display: 'flex', background: '#e5e7eb', borderRadius: 10, padding: 3, gap: 2 }}>
            <button
              type="button"
              onClick={() => { setUpdateMode('manual'); setManualError(null); setAiSubmitError(null); setAiError(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: 'none', background: updateMode === 'manual' ? 'white' : 'transparent', color: updateMode === 'manual' ? '#111' : '#9ca3af', fontWeight: 600, fontSize: 12, cursor: 'pointer', boxShadow: updateMode === 'manual' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}
            >
              <PenLine size={13} /> Manual
            </button>
            <button
              type="button"
              onClick={() => { setUpdateMode('ai'); resetAi(); setManualError(null); setAiSubmitError(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: 'none', background: updateMode === 'ai' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent', color: updateMode === 'ai' ? 'white' : '#9ca3af', fontWeight: 600, fontSize: 12, cursor: 'pointer', boxShadow: updateMode === 'ai' ? '0 1px 6px rgba(79,70,229,0.3)' : 'none', transition: 'all 0.15s' }}
            >
              <Sparkles size={13} /> AI Assist
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">

          {/* ── MANUAL ── */}
          {updateMode === 'manual' && (
            <div className="space-y-5">
              {/* Condition Status */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Condition Status <span className="text-red-500">*</span></label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {conditionOptions.map(opt => (
                    <label key={opt} style={{ flex: 1, border: `2px solid ${condition === opt ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: condition === opt ? '#fef2f2' : 'white', color: condition === opt ? '#dc2626' : '#374151', fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}>
                      <input type="radio" name="condition" value={opt} checked={condition === opt} onChange={() => setCondition(opt as ConditionStatus)} style={{ display: 'none' }} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              {/* Maintenance Needed */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Maintenance Needed?</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
                    <label key={label} style={{ flex: 1, border: `2px solid ${maintenanceNeeded === val ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', background: maintenanceNeeded === val ? '#fef2f2' : 'white', color: maintenanceNeeded === val ? '#dc2626' : '#374151', fontWeight: 600, fontSize: 13 }}>
                      <input type="radio" checked={maintenanceNeeded === val} onChange={() => setMaintenanceNeeded(val)} style={{ display: 'none' }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority — only when maintenance needed */}
              {maintenanceNeeded && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Priority <span className="text-red-500">*</span></label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['low', 'medium', 'high'] as PriorityLevel[]).map(p => (
                      <label key={p} style={{ flex: 1, border: `2px solid ${priority === p ? priorityColors[p].border : '#e5e7eb'}`, borderRadius: 10, padding: '8px', textAlign: 'center', cursor: 'pointer', background: priority === p ? priorityColors[p].bg : 'white', color: priority === p ? priorityColors[p].text : '#374151', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>
                        <input type="radio" checked={priority === p} onChange={() => setPriority(p)} style={{ display: 'none' }} />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Staff Feedback {maintenanceNeeded && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => {
                    const s = sanitizeFeedback(e.target.value);
                    setFeedback(countWords(s) <= FEEDBACK_MAX_WORDS ? s : truncateToWords(s, FEEDBACK_MAX_WORDS));
                    if (s.trim()) setManualError(null);
                  }}
                  rows={3}
                  placeholder="Describe the asset condition e.g. chair leg is loose, screen has cracks..."
                  className={`w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none ${
                    manualError ? 'border-red-500' : countWords(feedback) >= FEEDBACK_MAX_WORDS ? 'border-orange-400' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-400">Letters, numbers and basic punctuation only</span>
                  <span className={`text-xs font-semibold ${countWords(feedback) >= FEEDBACK_MAX_WORDS ? 'text-orange-500' : 'text-gray-400'}`}>
                    {countWords(feedback)} / {FEEDBACK_MAX_WORDS} words
                  </span>
                </div>
              </div>

              {/* Image — required only when maintenance needed */}
              {renderImageSection(maintenanceNeeded)}
            </div>
          )}

          {/* ── AI ASSIST ── */}
          {updateMode === 'ai' && (
            <div style={{ border: '2px solid #e0e7ff', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="white" />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Gemini AI Assessment</span>
                <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>Auto-analyze</span>
              </div>
              <div style={{ padding: 16, background: '#fafafe' }} className="space-y-4">
                {!aiResult && (
                  <>
                    {renderImageSection(true)}
                    {imageFile && !aiLoading && (
                      <button type="button" onClick={handleAiAnalyze} style={{ width: '100%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: 10, padding: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Sparkles size={15} /> Analyze with Gemini
                      </button>
                    )}
                    {aiLoading && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 44, height: 44, border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: 14 }}>Analyzing asset condition...</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Gemini is reviewing the image</div>
                      </div>
                    )}
                  </>
                )}
                {aiResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: priorityColors[aiResult.priority as PriorityLevel].bg, border: `1.5px solid ${priorityColors[aiResult.priority as PriorityLevel].border}`, borderRadius: 10, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Priority</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: priorityColors[aiResult.priority as PriorityLevel].text, marginTop: 2, textTransform: 'capitalize' }}>{aiResult.priority}</div>
                      </div>
                      <div style={{ background: aiResult.maintenanceNeeded ? '#fff7ed' : '#f0fdf4', border: `1.5px solid ${aiResult.maintenanceNeeded ? '#fdba74' : '#86efac'}`, borderRadius: 10, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Maintenance</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: aiResult.maintenanceNeeded ? '#ea580c' : '#16a34a', marginTop: 2 }}>{aiResult.maintenanceNeeded ? '⚠️ Needed' : '✓ Not needed'}</div>
                      </div>
                    </div>
                    {aiResult.issues?.length > 0 && (
                      <div style={{ background: 'white', border: '1.5px solid #e0e7ff', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 6 }}>Issues Detected</div>
                        {aiResult.issues.map((issue: string, i: number) => (
                          <div key={i} style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 6, marginBottom: 3 }}>
                            <span style={{ color: '#4f46e5' }}>•</span> {issue}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>AI Summary</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>{truncateToWords(aiResult.fullResponse ?? '', FEEDBACK_MAX_WORDS)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setManualError(null); setAiSubmitError(null);
                          if (!selectedLocation) { setAiSubmitError('Please select a location before submitting.'); setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
                          if (!selectedDepartment) { setAiSubmitError('Please select a department before submitting.'); setTimeout(() => aiErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
                          setAiSubmitError(null);
                          onSubmit({
                            condition: aiResult.condition,
                            location_id: selectedLocation,
                            department_id: selectedDepartment,
                            name: assetDetails?.name || 'N/A',
                            category: assetDetails?.category || 'N/A',
                            model: assetDetails?.model || 'N/A',
                            asset_id: assetDetails?.asset_id || item.code,
                          });
                        }}
                        style={{ flex: 1, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', border: 'none', borderRadius: 10, padding: 11, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <CheckCircle size={15} /> Done — Submit
                      </button>
                      <button type="button" onClick={resetAi} style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>
                        <RefreshCw size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  // ── Registering mode (unchanged) ─────────────────────────
  const renderDropdownSelectors = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {(!parentScan || parentScan.type !== 'location') && (
        <div>
          <label htmlFor="assetLocation" className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Location (Optional)
          </label>
          <select
            id="assetLocation"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="">-- None --</option>
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}
      {(!parentScan || parentScan.type !== 'department') && (
        <div>
          <label htmlFor="assetDept" className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Building2 className="w-4 h-4" /> Department (Optional)
          </label>
          <select
            id="assetDept"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg mt-1"
          >
            <option value="">-- None --</option>
            {departments.map((dept) => (
              <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const renderRegisteringContent = () => (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-300 text-blue-800 rounded-lg text-center">
        <strong className="flex items-center justify-center gap-2">
          <PackagePlus className="w-5 h-5" /> New Asset
        </strong>
        <p>This Asset ID was not found. Please register it.</p>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Register New Asset</h3>
        <div>
          <label className="text-sm font-medium text-gray-500">Asset ID</label>
          <p className="text-lg text-gray-800 font-mono p-2 bg-gray-100 rounded">{item?.code}</p>
        </div>
        <div>
          <label htmlFor="assetName" className="text-sm font-medium text-gray-700">Asset Name (Required)</label>
          <input id="assetName" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required
            className="w-full p-2 border border-gray-300 rounded-lg mt-1" placeholder="e.g., Dell Latitude 5420" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="assetCategory" className="text-sm font-medium text-gray-700">Category (Required)</label>
            <input id="assetCategory" type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required
              className="w-full p-2 border border-gray-300 rounded-lg mt-1" placeholder="e.g., Laptop, Furniture" />
          </div>
          <div>
            <label htmlFor="assetModel" className="text-sm font-medium text-gray-700">Model (Required)</label>
            <input id="assetModel" type="text" value={newModel} onChange={(e) => setNewModel(e.target.value)} required
              className="w-full p-2 border border-gray-300 rounded-lg mt-1" placeholder="e.g., Latitude 5420" />
          </div>
        </div>
        <div>
          <label htmlFor="assetDesc" className="text-sm font-medium text-gray-700">Description</label>
          <textarea id="assetDesc" value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg mt-1" rows={3} placeholder="e.g., 14-inch laptop, 16GB RAM" />
        </div>
        {renderDropdownSelectors()}
      </div>
      {/* Condition selector for registering */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Set Initial Condition</h3>
        <div className="flex flex-col sm:flex-row gap-4">
            {conditionOptions.map((option) => (
              <label key={option}
                className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  condition === option ? "border-red-600 bg-red-50 shadow-md" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input type="radio" name="condition" value={option} checked={condition === option}
                  onChange={() => setCondition(option)} className="sr-only" />
                <span className="text-lg font-medium text-gray-800">{option}</span>
              </label>
            ))}
          </div>
      </div>
    </div>
  );

  // ── Main form content dispatcher ─────────────────────────
  const renderFormContent = () => {
    if (mode === 'loading') return <div className="p-8 text-center text-gray-500">Searching for asset...</div>;

    if (mode === 'error') return (
      <div className="p-8">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
          <strong className="flex items-center justify-center gap-2"><AlertCircle className="w-5 h-5" /> Error</strong>
          <p>{error}</p>
        </div>
      </div>
    );

    if (mode === 'editing') {
      return pageStep === 'confirm' ? renderConfirmStep() : renderUpdateStep();
    }

    if (mode === 'registering') return renderRegisteringContent();

    return null;
  };

  // ── Header title ─────────────────────────────────────────
  const getHeaderTitle = () => {
    if (mode === 'registering') return 'Register Asset';
    if (mode === 'editing' && pageStep === 'update') return 'Update Asset';
    return 'Confirm Asset';
  };

  // ── Bottom action buttons ─────────────────────────────────
  const renderButtons = () => {
    // Loading / error — just back
    if (mode === 'loading' || mode === 'error') {
      return (
        <button type="button" onClick={onBack}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
          <ChevronLeft className="w-5 h-5" /> Back to Scan
        </button>
      );
    }

    // Editing — step 1
    if (mode === 'editing' && pageStep === 'confirm') {
      return (
        <>
          <button type="button" onClick={onBack}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <button type="button" onClick={() => setPageStep('update')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md">
            <Edit className="w-5 h-5" /> Update Asset
          </button>
        </>
      );
    }

    // Editing — step 2
    if (mode === 'editing' && pageStep === 'update') {
      const canSubmit = updateMode === 'manual' || (updateMode === 'ai' && !!aiResult);
      return (
        <>
          <button type="button" onClick={() => { setPageStep('confirm'); setImageFile(null); setImagePreview(''); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <button type="submit" disabled={!canSubmit}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
              canSubmit ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}>
            <CheckCircle className="w-5 h-5" /> Update Asset
          </button>
        </>
      );
    }

    // Registering
    if (mode === 'registering') {
      return (
        <>
          <button type="button" onClick={onBack}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-md">
            <ChevronLeft className="w-5 h-5" /> Back to Scan
          </button>
          <button type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md">
            <Save className="w-5 h-5" /> Register New Asset
          </button>
        </>
      );
    }

    return null;
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
                  <h1 className="text-2xl font-bold">{getHeaderTitle()}</h1>
                  <p className="text-sm text-red-100">Scanned Code: {item?.code}</p>
                </div>
              </div>
            </div>
            {renderFormContent()}
          </div>

          <div className="bg-white rounded-lg shadow-md">
            <div className="px-4 lg:px-6 py-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {renderButtons()}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
