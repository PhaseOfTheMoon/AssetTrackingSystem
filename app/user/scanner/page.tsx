// app/user/scanner/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Make sure this path is correct

// Import all your content components
import ScannerContent from '@/components/scanner/ScannerContext';
import SuccessContent from '@/components/scanner/SuccessContent';
import ConfirmationContent from '@/components/scanner/ConfirmationContent'; // We'll create this next

import { Package, Users, MapPin, Building2 } from 'lucide-react';

// Your config is perfect, no change
const configs = {
  asset: { title: "Asset Scanner", description: "Scan asset QR codes or barcodes", icon: Package, idColumn: "asset_id" },
  staff: { title: "Staff ID Scanner", description: "Scan staff identification codes", icon: Users, idColumn: "staff_id" },
  location: { title: "Location Scanner", description: "Scan location QR codes or barcodes", icon: MapPin, idColumn: "location_id" },
  department: { title: "Department Scanner", description: "Scan department codes", icon: Building2, idColumn: "department_id" },
};

export default function ScannerPage() {
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') || 'asset') as keyof typeof configs;
  
  // NEW State Management
  // 'scanning', 'confirmation', or 'success'
  const [pageState, setPageState] = useState('scanning'); 
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const config = configs[type] || configs.asset;

  // On page load (or if 'type' changes), reset to the scanning state
  useEffect(() => {
    setPageState('scanning');
    setScannedItem(null);
    setSubmittedData(null);
  }, [type]);

  // Called from ScannerContent after one scan
  const handleItemScanned = async (item: any) => {
    setScannedItem(item); // Always save the scanned item

    // CASE 1: The scan is for an ASSET
    if (type === 'asset') {
      setPageState('confirmation'); // Go to confirmation page
    
    // CASE 2: The scan is for anything ELSE (Staff, Location, etc.)
    } else {
      // Just insert the scan and go to success
      const dataToInsert = [{
        [config.idColumn]: item.code,
        created_at: new Date().toISOString(),
      }];

      try {
        const { error } = await supabase.from(type).insert(dataToInsert);
        if (error) throw error;
        
        setSubmittedData({ items: [item], page: type });
        setPageState('success'); // Go to success page
        
      } catch (e: any) {
        alert(`Error saving to ${type}: ${e.message}`);
      }
    }
  };
  
  // Called from ConfirmationContent
  const handleAssetUpdate = async (newStatus: string) => {
    if (!scannedItem || type !== 'asset') {
      alert("Error: No asset found to update.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('asset')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq(config.idColumn, scannedItem.code);

      if (error) throw error;
      
      setSubmittedData({ items: [scannedItem], page: type });
      setPageState('success'); // Go to success page

    } catch (e: any) {
      alert(`Error updating asset: ${e.message}`);
    }
  };

  // Render the correct component based on state
  if (pageState === 'success') {
    return (
      <SuccessContent
        scannedCount={submittedData.items.length}
        scanType={configs[submittedData.page as keyof typeof configs].title.split(" ")[0]}
      />
    );
  }

  if (pageState === 'confirmation') {
    return (
      <ConfirmationContent
        item={scannedItem}
        tableName={type}
        onBack={() => setPageState('scanning')} // Go back to scanning
        onSubmit={handleAssetUpdate}
      />
    );
  }

  // Default: pageState === 'scanning'
  return (
    <ScannerContent
      {...config}
      // Pass the correct props
      onItemScanned={handleItemScanned}
      onBack={() => window.location.href = '/user/dashboard'} // Or wherever "Home" is
    />
  );
}