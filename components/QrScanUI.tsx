// components/QrScanUI.tsx
"use client";

import { QrCode, Barcode, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function QrScanUI() {
  return (
    <div className="w-[380px] mx-auto border rounded-2xl shadow-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-red-600 text-white relative">
        {/* 左边：返回按钮 + Profile */}
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-gray-200">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <img
            src="/profile.jpg"
            alt="Profile"
            className="w-10 h-10 rounded-full border border-white"
          />
        </div>

        {/* 中间标题 */}
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold">
          Asset Scanner
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex justify-around text-sm text-black border-b">
        <button className="p-3 font-semibold border-b-2 border-red-600">
          QR Scan
        </button>
        <button className="p-3 text-gray-500 hover:text-black">
          Barcode Scan
        </button>
      </div>

      {/* Scan Area */}
      <div className="p-6">
        <div className="w-full h-60 border-2 border-dashed border-black rounded-xl flex flex-col justify-center items-center bg-gray-50">
          <QrCode className="w-12 h-12 text-red-600 mb-2" />
          <p className="text-gray-700">Scan QR or Barcode here</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-around p-4 border-t bg-gray-100">
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700">
          <QrCode className="w-5 h-5" /> QR Code
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg shadow hover:bg-gray-800">
          <Barcode className="w-5 h-5" /> Barcode
        </button>
      </div>
    </div>
  );
}
