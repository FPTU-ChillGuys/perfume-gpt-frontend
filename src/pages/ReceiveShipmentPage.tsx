import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { receiveShipmentService, type ImportTicketDetailResponse, type ImportTicketItem, type ImportDetailData } from "../services/receiveShipmentService";

interface ConfirmationItem extends ImportDetailData {
  verified: boolean;
  actualReceived: number;
  damaged: number;
}

const ReceiveShipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ImportTicketItem[]>([]);
  const [ticketData, setTicketData] = useState<ImportTicketDetailResponse["payload"] | null>(null);
  const [items, setItems] = useState<ConfirmationItem[]>([]);
  const [staffComments, setStaffComments] = useState<string>("");
  const [loadedPO, setLoadedPO] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Load tickets on mount
  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoadingTickets(true);
        const response = await receiveShipmentService.getImportTickets(
          undefined,
          "Pending",
          1,
          10
        );
        setTickets(response.payload.items);
      } catch (err: any) {
        setError(err.message || "Failed to load tickets");
      } finally {
        setLoadingTickets(false);
      }
    };

    loadTickets();
  }, []);

  const handleSelectTicket = async (ticketId: string) => {
    try {
      setError("");
      setIsLoading(true);

      // Fetch ticket detail from API
      const response = await receiveShipmentService.getImportTicketDetail(ticketId);
      const ticketPayload = response.payload;

      setTicketData(ticketPayload);

      // Convert API data to ConfirmationItem format
      const confirmationItems: ConfirmationItem[] = ticketPayload.importDetails.map(
        (detail) => ({
          ...detail,
          verified: false,
          actualReceived: 0,
          damaged: 0,
        })
      );

      setItems(confirmationItems);
      setLoadedPO(true);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
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

  const handleConfirmArrival = async () => {
    try {
      setError("");
      setIsLoading(true);

      if (!ticketData) {
        setError("Please load an order first");
        return;
      }

      const importDetails = items.map((item) => ({
        importDetailId: item.id,
        rejectQuantity: item.damaged,
        note: staffComments || null,
        batches: item.batches,
      }));

      await receiveShipmentService.verifyTicket(ticketData.id, importDetails);
      
      setError("");
      alert("Shipment verified successfully!");
      // Reset form or navigate to next step
    } catch (err: any) {
      setError(err.message || "Failed to verify shipment");
    } finally {
      setIsLoading(false);
    }
  };

  const totalSkus = items.length;
  const verifiedCount = items.filter(item => item.verified).length;
  const totalUnitsExpected = items.reduce((sum, item) => sum + item.quantity, 0);

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
          <h1 className="text-4xl font-black text-gray-900 mb-2">Receive Shipment Confirmation</h1>
          <p className="text-gray-500 text-base">Verify incoming goods against Purchase Order data for inventory reconciliation.</p>
        </div>

        {/* PO Number Input */}
        <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200">
          <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-widest">Pending Import Tickets</label>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {loadingTickets ? (
            <div className="text-center py-4 text-gray-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No pending tickets found</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket.id)}
                  disabled={isLoading}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    ticketData?.id === ticket.id
                      ? "bg-red-50 border-red-300 text-red-900"
                      : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  <div className="font-semibold">{ticket.supplierName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {ticket.id} | Date: {new Date(ticket.importDate).toLocaleDateString()} | Items: {ticket.totalItems}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Arrival Confirmation Section */}
        {loadedPO && (
          <div className="mb-8 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">📦</span>
                  <h2 className="text-lg font-bold text-gray-900">Arrival Confirmation - PO #882910</h2>
                </div>
                <a href="#" className="text-xs text-red-600 font-bold hover:underline">View Original PO ↗</a>
              </div>
              <div className="flex gap-8 mt-3 text-xs">
                <div>
                  <span className="text-gray-600">SUPPLIER: </span>
                  <span className="font-bold text-gray-900">ESSENCE LOGISTICS INC.</span>
                </div>
                <div>
                  <span className="text-gray-600">DATE: </span>
                  <span className="font-bold text-gray-900">OCT 24, 2023</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">Verified</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">Product SKU / Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">Ordered Qty (As per PO)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-red-600">Actual Received</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-red-600">Damaged/Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox"
                          checked={item.verified}
                          onChange={(e) => handleItemChange(idx, "verified", e.target.checked)}
                          className="w-5 h-5 rounded border-gray-200 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{item.variantName}</div>
                        <div className="text-xs text-gray-500">SKU {item.variantSku}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-gray-900">
                        {item.quantity} units
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          value={item.actualReceived}
                          onChange={(e) => handleItemChange(idx, "actualReceived", e.target.value)}
                          className="w-24 px-3 py-2 rounded border border-gray-200 bg-red-50 text-gray-900 font-semibold focus:border-red-500 focus:outline-none text-center"
                          min="0"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          value={item.damaged}
                          onChange={(e) => handleItemChange(idx, "damaged", e.target.value)}
                          className="w-24 px-3 py-2 rounded border border-gray-200 bg-white text-gray-900 font-semibold focus:border-red-500 focus:outline-none text-center"
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
              <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-widest">Staff Comments / Discrepancy Notes</label>
              <textarea 
                value={staffComments}
                onChange={(e) => setStaffComments(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-red-500 focus:outline-none h-32 resize-none"
                placeholder="Describe any damaged packaging, missing items, or delivery issues here..."
              />
            </div>

            {/* Verification Summary */}
            <div className="bg-red-50 rounded-lg p-6 border-2 border-red-100">
              <h3 className="text-lg font-black text-red-600 mb-4">Verification Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total SKUs:</span>
                  <span className="font-semibold text-gray-900">{totalSkus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verified:</span>
                  <span className="font-semibold text-gray-900">{verifiedCount} / {totalSkus}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Units Expected:</span>
                  <span className="font-semibold text-gray-900">{totalUnitsExpected}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="flex items-start gap-2 text-red-600 text-xs font-bold">
                  <span>⚠️</span>
                  <span>ALL ITEMS MUST BE VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-6">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm font-bold text-gray-500">Active Inspector: Dang Khoa (Warehouse-B)</p>
            <div className="flex gap-4 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none px-10 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                SAVE DRAFT
              </button>
              <button 
                onClick={handleConfirmArrival}
                disabled={isLoading || !loadedPO}
                className="flex-1 sm:flex-none px-8 py-3 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Processing..." : "✓ CONFIRM ARRIVAL"}
              </button>
            </div>
          </div>
        </footer>
    </div>
  );
};

export default ReceiveShipmentPage;
