import React, { useState } from "react";

interface ConfirmationItem {
  verified: boolean;
  sku: string;
  skuCode: string;
  orderedQty: number;
  actualReceived: number;
  damaged: number;
}

const initialItems: ConfirmationItem[] = [
  {
    verified: true,
    sku: "Oud Wood - 50ml",
    skuCode: "TF-OW-50",
    orderedQty: 120,
    actualReceived: 120,
    damaged: 0,
  },
  {
    verified: false,
    sku: "Rose Ember - 100ml",
    skuCode: "RE-100-XP",
    orderedQty: 85,
    actualReceived: 0,
    damaged: 0,
  },
  {
    verified: false,
    sku: "Midnight Jasmine - 30ml",
    skuCode: "MJ-30-XJ",
    orderedQty: 200,
    actualReceived: 0,
    damaged: 0,
  },
  {
    verified: false,
    sku: "Saffron Gold - 50ml",
    skuCode: "SG-50-GOLD",
    orderedQty: 50,
    actualReceived: 0,
    damaged: 0,
  },
];

const ReceiveShipmentPage: React.FC = () => {
  const [poNumber, setPoNumber] = useState<string>("PO-882910-2023");
  const [items, setItems] = useState<ConfirmationItem[]>(initialItems);
  const [staffComments, setStaffComments] = useState<string>("");
  const [loadedPO, setLoadedPO] = useState<boolean>(false);

  const handleLoadOrder = () => {
    setLoadedPO(true);
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[idx];
    if (field === "verified") {
      item.verified = value;
    } else if (field === "actualReceived") {
      item.actualReceived = Number(value);
    } else if (field === "damaged") {
      item.damaged = Number(value);
    }
    setItems(newItems);
  };

  const totalSkus = items.length;
  const verifiedCount = items.filter(item => item.verified).length;
  const totalUnitsExpected = items.reduce((sum, item) => sum + item.orderedQty, 0);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 lg:px-10">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-red-600">PerfumeGPT</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors" href="#">Dashboard</a>
            <a className="text-sm font-semibold text-red-600 underline" href="#">Shipments</a>
            <a className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors" href="#">Inventory</a>
            <a className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors" href="#">Reports</a>
          </nav>
          <div className="w-10 h-10 rounded-full bg-gray-300"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 py-8 lg:px-10">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Receive Shipment Confirmation</h1>
          <p className="text-gray-500 text-base">Verify incoming goods against Purchase Order data for inventory reconciliation.</p>
        </div>

        {/* PO Number Input */}
        <div className="mb-8 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-widest">Purchase Order or Delivery Note</label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-red-600">
                📋
              </span>
              <input 
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full pl-10 px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:border-red-500 focus:outline-none"
                placeholder="Enter PO number..."
              />
            </div>
            <button 
              onClick={handleLoadOrder}
              className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              🔍 LOAD ORDER
            </button>
          </div>
        </div>

        {/* Arrival Confirmation Section */}
        {loadedPO && (
          <div className="mb-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">📦</span>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Arrival Confirmation - PO #882910</h2>
                </div>
                <a href="#" className="text-xs text-red-600 font-bold hover:underline">View Original PO ↗</a>
              </div>
              <div className="flex gap-8 mt-3 text-xs">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">SUPPLIER: </span>
                  <span className="font-bold text-gray-900 dark:text-white">ESSENCE LOGISTICS INC.</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">DATE: </span>
                  <span className="font-bold text-gray-900 dark:text-white">OCT 24, 2023</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Verified</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Product SKU / Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Ordered Qty (As per PO)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-red-600">Actual Received</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-red-600">Damaged/Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox"
                          checked={item.verified}
                          onChange={(e) => handleItemChange(idx, "verified", e.target.checked)}
                          className="w-5 h-5 rounded border-gray-200 dark:border-gray-700 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{item.sku}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">SKU {item.skuCode}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900 dark:text-white">
                        {item.orderedQty} units
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          value={item.actualReceived}
                          onChange={(e) => handleItemChange(idx, "actualReceived", e.target.value)}
                          className="w-24 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-white font-semibold focus:border-red-500 focus:outline-none text-center"
                          min="0"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          value={item.damaged}
                          onChange={(e) => handleItemChange(idx, "damaged", e.target.value)}
                          className="w-24 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:border-red-500 focus:outline-none text-center"
                          min="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Comments and Summary */}
        {loadedPO && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-widest">Staff Comments / Discrepancy Notes</label>
              <textarea 
                value={staffComments}
                onChange={(e) => setStaffComments(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-red-500 focus:outline-none h-32 resize-none"
                placeholder="Describe any damaged packaging, missing items, or delivery issues here..."
              />
            </div>

            {/* Verification Summary */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border-2 border-red-100 dark:border-red-800">
              <h3 className="text-lg font-black text-red-600 mb-4">Verification Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total SKUs:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{totalSkus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Verified:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{verifiedCount} / {totalSkus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Units Expected:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{totalUnitsExpected}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2 text-red-600 text-xs font-bold">
                  <span>⚠️</span>
                  <span>ALL ITEMS MUST BE VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer with Actions */}
      {loadedPO && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-4 px-6">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm font-bold text-gray-500">Active Inspector: Dang Khoa (Warehouse-B)</p>
            <div className="flex gap-4 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-10 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                SAVE DRAFT
              </button>
              <button className="flex-1 sm:flex-none px-8 py-3 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                ✓ CONFIRM ARRIVAL
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default ReceiveShipmentPage;
