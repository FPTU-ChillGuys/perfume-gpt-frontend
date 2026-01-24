import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface ShipmentItem {
  sku: string;
  quantity: number;
  price: number;
}
const suppliers = [
  { value: "1", label: "Essence Logistics Inc." },
  { value: "2", label: "Global Scent Distributors" },
  { value: "3", label: "Parisian Bottles Co." },
];

const warehouses = [
  { value: "w1", label: "Warehouse-A (Main Hub)" },
  { value: "w2", label: "Warehouse-B (Cold Storage)" },
  { value: "w3", label: "Warehouse-B (Stock)" },
];

const initialItems: ShipmentItem[] = [
  {
    sku: "Oud Wood - 50ml (TF-OW-50)",
    quantity: 120,
    price: 45.0,
  },
  {
    sku: "Rose Ember - 100ml (RE-100-XP)",
    quantity: 85,
    price: 32.5,
  },
];

const ShipmentOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<string>("");
  const [warehouse, setWarehouse] = useState<string>("w3");
  const [items, setItems] = useState<ShipmentItem[]>(initialItems);
  const [notes, setNotes] = useState<string>("");

  const handleItemChange = (idx: number, field: keyof ShipmentItem, value: string | number) => {
    const newItems = [...items];
    switch (field) {
      case "sku":
        newItems[idx].sku = String(value);
        break;
      case "quantity":
        newItems[idx].quantity = Number(value);
        break;
      case "price":
        newItems[idx].price = Number(value);
        break;
      default:
        break;
    }
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { sku: "", quantity: 0, price: 0 },
    ]);
  };

  const handleDeleteItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalUnits = items.reduce((sum: number, item: ShipmentItem) => sum + item.quantity, 0);
  const grandTotal = items.reduce((sum: number, item: ShipmentItem) => sum + item.quantity * item.price, 0);

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
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Create Inbound Shipment Order</h1>
          <p className="text-gray-500 text-base">Define the source supplier and destination warehouse for incoming inventory.</p>
        </div>

        {/* Supplier & Warehouse Selection */}
        <div className="mb-8 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-widest">Supplier Source</label>
              <select 
                value={supplier} 
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:border-red-500 focus:outline-none appearance-none"
              >
                <option value="">Select Supplier...</option>
                {suppliers.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-widest">Target Warehouse</label>
              <select 
                value={warehouse} 
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:border-red-500 focus:outline-none appearance-none"
              >
                <option value="">Select Target Warehouse...</option>
                {warehouses.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Shipment Items Table */}
        <div className="mb-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-red-600">🛒</span> Shipment Items
            </h2>
            <button 
              onClick={handleAddItem}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-sm transition-colors"
            >
              + ADD NEW SKU
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Product SKU / Search</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Planned Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Unit Price ($)</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-red-600 uppercase tracking-wide">Total Expected Value</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-6 py-4">
                      <input 
                        type="text"
                        value={item.sku}
                        onChange={(e) => handleItemChange(idx, "sku", e.target.value)}
                        className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-red-500 focus:outline-none"
                        placeholder="Search SKU or Name..."
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:border-red-500 focus:outline-none"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                        className="w-20 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold focus:border-red-500 focus:outline-none"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-6 py-4 text-right font-black text-red-600">
                      ${(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteItem(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes and Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-widest">Shipment Instructions / Internal Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-red-500 focus:outline-none h-32 resize-none"
              placeholder="Add specific delivery instructions, handling requirements, or notes for the warehouse receiving staff..."
            />
          </div>

          {/* Order Summary */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border-2 border-red-100 dark:border-red-800">
            <h3 className="text-lg font-black text-red-600 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Items Ordered:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{items.length} SKUs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Unit Count:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{totalUnits} units</span>
              </div>
              <div className="border-t border-red-200 dark:border-red-800 pt-3 mt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-black text-red-600">Grand Total:</span>
                  <span className="font-black text-red-600">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                <span>⚠️</span>
                <span>WAREHOUSE WILL BE NOTIFIED ON SAVE</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-4 px-6">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm font-bold text-gray-500">Creator: Huu Phuoc (Administrator - Owner)</p>
          <div className="flex gap-4 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-10 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              SAVE DRAFT
            </button>
            <button 
              onClick={() => navigate("/receive-shipment")}
              className="flex-1 sm:flex-none px-8 py-3 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              ▶ CREATE SHIPMENT & NOTIFY WAREHOUSE
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ShipmentOrderPage;
    