import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { shipmentService } from "../services/shipmentService";
import { productService } from "../services/productService";
import type { Supplier, ProductVariant } from "../services/productService";

interface ShipmentItem {
  variantId: string;
  quantity: number;
  price: number;
}

const ShipmentOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(true);
  const [loadingVariants, setLoadingVariants] = useState<boolean>(false);

  // Load suppliers on mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const supplierList = await productService.getSuppliers();
        setSuppliers(supplierList);
        if (supplierList.length > 0) {
          setSelectedSupplierId(supplierList[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load suppliers");
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, []);

  // Load product variants on supplier change
  useEffect(() => {
    const loadVariants = async () => {
      try {
        setLoadingVariants(true);
        const variantList = await productService.getProductVariants();
        setVariants(variantList);
      } catch (err: any) {
        console.error("Failed to load variants:", err);
        setVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    };

    loadVariants();
  }, [selectedSupplierId]);

  const handleItemChange = (idx: number, field: keyof ShipmentItem, value: string | number) => {
    const newItems = [...items];
    switch (field) {
      case "variantId":
        newItems[idx].variantId = String(value);
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
      { variantId: "", quantity: 0, price: 0 },
    ]);
  };

  const handleDeleteItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalUnits = items.reduce((sum: number, item: ShipmentItem) => sum + item.quantity, 0);
  const grandTotal = items.reduce((sum: number, item: ShipmentItem) => sum + item.quantity * item.price, 0);

  const handleCreateShipment = async () => {
    try {
      setError("");
      setIsLoading(true);

      if (items.length === 0) {
        setError("Please add at least one item");
        return;
      }

      // Validate all items have variantId
      const invalidItems = items.filter((item) => !item.variantId);
      if (invalidItems.length > 0) {
        setError("Please select a product for all items");
        return;
      }

      // Convert items to import details format using variantId from API
      const importDetails = items.map((item) => ({
        variantId: item.variantId, // Use variantId from product API
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      // Create today's date in ISO format
      const importDate = new Date().toISOString().split("T")[0];

      console.log("Creating shipment with:", {
        selectedSupplierId,
        importDate,
        importDetails,
      });

      // Call API
      await shipmentService.createImportTicket(
        selectedSupplierId,
        importDate,
        importDetails
      );

      // Success - navigate to receive shipment
      navigate("/receive-shipment");
    } catch (err: any) {
      setError(err.message || "Failed to create shipment");
      console.error("Shipment creation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 px-6 py-4 lg:px-10">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-red-600">PerfumeGPT</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate("/admin/dashboard")} className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors cursor-pointer bg-none border-none p-0">Dashboard</button>
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
          <h1 className="text-4xl font-black text-gray-900 mb-2">Create Inbound Shipment Order</h1>
          <p className="text-gray-500 text-base">Define the source supplier and destination warehouse for incoming inventory.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 font-semibold">
            {error}
          </div>
        )}

        {/* Supplier Selection */}
        <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200">
          <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-widest">Select Supplier</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
            disabled={loadingSuppliers}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 font-medium focus:border-red-500 focus:outline-none disabled:opacity-50"
          >
            {loadingSuppliers ? (
              <option>Loading suppliers...</option>
            ) : (
              suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} {supplier.contactEmail && `(${supplier.contactEmail})`}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Shipment Items Table */}
        <div className="mb-8 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
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
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Product SKU / Search</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Planned Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Unit Price ($)</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-red-600 uppercase tracking-wide">Total Expected Value</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <select
                        value={item.variantId}
                        onChange={(e) => {
                          const selectedVariant = variants.find(
                            (v) => v.id === e.target.value
                          );
                          handleItemChange(idx, "variantId", e.target.value);
                          if (selectedVariant) {
                            handleItemChange(idx, "price", selectedVariant.basePrice);
                          }
                        }}
                        className="w-full px-3 py-2 rounded border border-gray-200 bg-white text-gray-900 focus:border-red-500 focus:outline-none"
                        disabled={loadingVariants || variants.length === 0}
                      >
                        <option value="">
                          {loadingVariants ? "Loading..." : "Select Product..."}
                        </option>
                        {variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.displayName} - {variant.sku} ({variant.volumeMl}ml)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-20 px-3 py-2 rounded border border-gray-200 bg-white text-gray-900 font-semibold focus:border-red-500 focus:outline-none"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                        className="w-20 px-3 py-2 rounded border border-gray-200 bg-white text-gray-900 font-semibold focus:border-red-500 focus:outline-none"
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
          {/* Order Summary */}
          <div className="lg:col-start-2 bg-red-50 rounded-lg p-6 border-2 border-red-100">
            <h3 className="text-lg font-black text-red-600 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items Ordered:</span>
                <span className="font-semibold text-gray-900">{items.length} SKUs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Unit Count:</span>
                <span className="font-semibold text-gray-900">{totalUnits} units</span>
              </div>
              <div className="border-t border-red-200 pt-3 mt-3">
                <div className="flex justify-between text-lg">
                  <span className="font-black text-red-600">Grand Total:</span>
                  <span className="font-black text-red-600">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-red-200">
              <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                <span>⚠️</span>
                <span>WAREHOUSE WILL BE NOTIFIED ON SAVE</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-6">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm font-bold text-gray-500">Creator: Huu Phuoc (Administrator - Owner)</p>
          <div className="flex gap-4 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-10 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
              SAVE DRAFT
            </button>
            <button 
              onClick={handleCreateShipment}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-8 py-3 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "LOADING..." : "▶ CREATE SHIPMENT & NOTIFY WAREHOUSE"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ShipmentOrderPage;
    