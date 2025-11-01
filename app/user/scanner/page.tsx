// app/user/scanner/page.tsx
'use client';

import ScannerContent from '@/components/scanner/ScannerContext';
import SuccessContent from '@/components/scanner/SuccessContent';
import { useSearchParams } from 'next/navigation';
import { Package, Users, MapPin, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

const configs = {
  asset: { title: "Asset Scanner", description: "Scan asset QR codes or barcodes", icon: Package },
  staff: { title: "Staff ID Scanner", description: "Scan staff identification codes", icon: Users },
  location: { title: "Location Scanner", description: "Scan location QR codes or barcodes", icon: MapPin },
  department: { title: "Department Scanner", description: "Scan department codes", icon: Building2 },
};

export default function ScannerPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'asset';
  const [submittedData, setSubmittedData] = useState<any>(null);

  const config = configs[type as keyof typeof configs] || configs.asset;

  const handleSubmit = async (items: any[]) => {
    const dataToInsert = items.map(item => ({
      code_type: type,
      code_value: item.code,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("scans").insert(dataToInsert);
    if (error) throw error;

    setSubmittedData({ items, page: type });
  };

  if (submittedData) {
    return (
      <SuccessContent
        scannedCount={submittedData.items.length}
        scanType={configs[submittedData.page as keyof typeof configs].title.split(" ")[0]}
      />
    );
  }

  return <ScannerContent {...config} onSubmit={handleSubmit} />;
}