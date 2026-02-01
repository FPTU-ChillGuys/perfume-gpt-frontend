import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  receiveShipmentService,
  type ImportTicketDetailResponse,
  type ImportTicketItem,
  type ImportDetailData,
  type BatchVerifyData,
} from "../services/receiveShipmentService";

interface ConfirmationItem extends ImportDetailData {
  verified: boolean;
  actualReceived: number;
  damaged: number;
  verifyBatches: BatchVerifyData[];
}

const ReceiveShipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ImportTicketItem[]>([]);
  const [ticketData, setTicketData] = useState<
    ImportTicketDetailResponse["payload"] | null
  >(null);
  const [items, setItems] = useState<ConfirmationItem[]>([]);
  const [staffComments, setStaffComments] = useState<string>("");
  const [loadedPO, setLoadedPO] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number>(-1);
  const [selectedStatus, setSelectedStatus] = useState<string>("Pending");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Load tickets on mount or when status changes
  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoadingTickets(true);
        const response = await receiveShipmentService.getImportTickets(
          undefined,
          selectedStatus || undefined,
          1,
          10,
        );
        setTickets(response.payload.items);
      } catch (err: any) {
        setError(err.message || "Failed to load tickets");
      } finally {
        setLoadingTickets(false);
      }
    };

    loadTickets();
  }, [selectedStatus]);

  const handleSelectTicket = async (ticketId: string) => {
    try {
      setError("");
      setIsLoading(true);

      // Fetch ticket detail from API
      const response =
        await receiveShipmentService.getImportTicketDetail(ticketId);
      const ticketPayload = response.payload;

      setTicketData(ticketPayload);

      const confirmationItems: ConfirmationItem[] =
        ticketPayload.importDetails.map((detail) => {
          // Calculate totalBatchQty from batches
          const totalBatchQty = detail.batches.reduce(
            (sum, batch) => sum + batch.importQuantity,
            0,
          );

          // Calculate shortage (damaged) = ordered - received
          const shortage = Math.max(0, detail.quantity - totalBatchQty);

          return {
            ...detail,
            verified: ticketPayload.status === "Verified",
            actualReceived: totalBatchQty,
            damaged: shortage,
            verifyBatches: detail.batches.map((batch) => ({
              batchCode: batch.batchCode,
              manufactureDate: batch.manufactureDate,
              expiryDate: batch.expiryDate,
              quantity: batch.importQuantity,
            })),
          };
        });

      setItems(confirmationItems);
      setLoadedPO(true);
    } catch (err: any) {
      setError(err.message || "Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTicketStatus = async () => {
    try {
      setError("");
      setIsLoading(true);

      if (!ticketData) {
        setError("Please load a ticket first");
        return;
      }

      await receiveShipmentService.updateTicketStatus(
        ticketData.id,
        "InProgress",
      );

      // Update local state
      if (ticketData) {
        ticketData.status = "InProgress";
        setTicketData({ ...ticketData });
      }

      alert("Ticket status updated to In Progress!");
    } catch (err: any) {
      console.error("❌ Failed to update status:", err);
      setError(err.message || "Failed to update ticket status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this ticket? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setError("");
      setIsLoading(true);

      await receiveShipmentService.deleteTicket(ticketId);

      // Remove from list
      setTickets(tickets.filter((t) => t.id !== ticketId));

      // Clear form if deleted ticket was selected
      if (ticketData?.id === ticketId) {
        setLoadedPO(false);
        setItems([]);
        setStaffComments("");
        setTicketData(null);
      }

      setIsLoading(false);
      alert("Ticket deleted successfully!");
    } catch (err: any) {
      // Check if it's a 401 error
      if (err.response?.status === 401 || err.message?.includes("401")) {
        setError("Your session has expired. Please login again.");
        // Don't set isLoading to false, let it redirect
        return;
      }
      setError(err.message || "Failed to delete ticket");
      setIsLoading(false);
    }
  };

  const handleUpdateTicket = async () => {
    try {
      setError("");
      setIsLoading(true);

      if (!ticketData) {
        setError("Please load a ticket first");
        setIsLoading(false);
        return;
      }

      const updateDetails = items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      await receiveShipmentService.updateTicket(ticketData.id, {
        supplierId: ticketData.supplierId,
        importDate: ticketData.importDate,
        importDetails: updateDetails,
      });

      setIsEditMode(false);
      alert("Ticket updated successfully!");

      // Reload ticket data
      const response = await receiveShipmentService.getImportTicketDetail(
        ticketData.id,
      );
      setTicketData(response.payload);
      setIsLoading(false);
    } catch (err: any) {
      if (err.response?.status === 401 || err.message?.includes("401")) {
        setError("Your session has expired. Please login again.");
        return;
      }
      setError(err.message || "Failed to update ticket");
      setIsLoading(false);
    }
  };

  const handleEditTicketField = (
    field: "supplierId" | "importDate",
    value: string,
  ) => {
    if (!ticketData) return;
    if (field === "supplierId") {
      setTicketData({ ...ticketData, supplierId: Number(value) });
      return;
    }

    setTicketData({ ...ticketData, importDate: value });
  };

  const handleEditItemField = (
    idx: number,
    field: "quantity" | "unitPrice",
    value: string,
  ) => {
    const newItems = [...items];
    const item = newItems[idx];

    if (field === "quantity") {
      item.quantity = Number(value);
      const totalBatchQty = item.verifyBatches.reduce(
        (sum, b) => sum + b.quantity,
        0,
      );
      const shortage = Math.max(0, item.quantity - totalBatchQty);
      item.damaged = shortage;
      item.actualReceived = totalBatchQty;
    }

    if (field === "unitPrice") {
      item.unitPrice = Number(value);
    }

    setItems(newItems);
  };

  const handleBatchChange = (
    itemIdx: number,
    batchIdx: number,
    field: string,
    value: string,
  ) => {
    const newItems = [...items];
    const item = newItems[itemIdx];
    const batch = item.verifyBatches[batchIdx];

    switch (field) {
      case "batchCode":
        batch.batchCode = value;
        break;
      case "manufactureDate":
        batch.manufactureDate = value;
        break;
      case "expiryDate":
        batch.expiryDate = value;
        break;
      case "quantity":
        batch.quantity = Number(value);
        break;
      default:
        break;
    }

    // Auto-calculate based on total batch quantity vs ordered quantity
    const totalBatchQty = item.verifyBatches.reduce(
      (sum, b) => sum + b.quantity,
      0,
    );
    const shortage = Math.max(0, item.quantity - totalBatchQty);

    // damaged = shortage (missing units)
    item.damaged = shortage;
    // actualReceived = total batches received
    item.actualReceived = totalBatchQty;

    setItems(newItems);
  };

  const openBatchModal = (itemIdx: number) => {
    setEditingItemIdx(itemIdx);
    setShowBatchModal(true);
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setEditingItemIdx(-1);
  };

  const addNewBatch = () => {
    if (editingItemIdx >= 0) {
      const newItems = [...items];
      const item = newItems[editingItemIdx];
      item.verifyBatches.push({
        batchCode: "",
        manufactureDate: "",
        expiryDate: "",
        quantity: 0,
      });

      // Auto-calculate based on total batch quantity vs ordered quantity
      const totalBatchQty = item.verifyBatches.reduce(
        (sum, b) => sum + b.quantity,
        0,
      );
      const shortage = Math.max(0, item.quantity - totalBatchQty);
      item.damaged = shortage;
      item.actualReceived = totalBatchQty;

      setItems(newItems);
    }
  };

  const deleteBatch = (batchIdx: number) => {
    if (editingItemIdx >= 0) {
      const newItems = [...items];
      const item = newItems[editingItemIdx];
      item.verifyBatches.splice(batchIdx, 1);

      // Auto-calculate based on total batch quantity vs ordered quantity
      const totalBatchQty = item.verifyBatches.reduce(
        (sum, b) => sum + b.quantity,
        0,
      );
      const shortage = Math.max(0, item.quantity - totalBatchQty);
      item.damaged = shortage;
      item.actualReceived = totalBatchQty;

      setItems(newItems);
    }
  };

  const getItemVerificationStatus = (
    item: ConfirmationItem,
  ): {
    status: "valid" | "warning" | "invalid";
    icon: string;
    reason: string;
  } => {
    // Check if batches are properly filled
    const invalidBatches = item.verifyBatches.filter(
      (batch) =>
        !batch.batchCode ||
        !batch.manufactureDate ||
        !batch.expiryDate ||
        batch.quantity <= 0,
    );

    // RED X - Invalid (Cannot confirm)
    if (invalidBatches.length > 0) {
      return { status: "invalid", icon: "✕", reason: "Incomplete batch info" };
    }

    // No batches added
    if (item.verifyBatches.length === 0) {
      return { status: "invalid", icon: "✕", reason: "No batches added" };
    }

    // YELLOW ~ - Warning (Can confirm but with issues)
    // Check for damaged units
    if (item.damaged > 0) {
      return {
        status: "warning",
        icon: "~",
        reason: `${item.damaged} units damaged`,
      };
    }

    // YELLOW ~ - Warning (Can confirm but with issues)
    // Check if actual received is less than expected quantity
    if (item.actualReceived < item.quantity) {
      return {
        status: "warning",
        icon: "~",
        reason: `Only received ${item.actualReceived}/${item.quantity}`,
      };
    }

    // YELLOW ~ - Warning (Can confirm but with issues)
    // Check if received more than expected
    if (item.actualReceived > item.quantity) {
      return {
        status: "warning",
        icon: "~",
        reason: `Received ${item.actualReceived} more than expected ${item.quantity}`,
      };
    }

    // GREEN ✓ - Valid (Perfect - no issues)
    return { status: "valid", icon: "✓", reason: "Perfect receive" };
  };

  const validateAllItems = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    items.forEach((item, idx) => {
      // Check if batches are filled
      if (item.verifyBatches.length === 0) {
        errors.push(`Item ${idx + 1} (${item.variantName}): No batches added`);
        return;
      }

      // Check each batch for required fields
      item.verifyBatches.forEach((batch, batchIdx) => {
        if (!batch.batchCode) {
          errors.push(
            `Item ${idx + 1}, Batch ${batchIdx + 1}: Missing batch code`,
          );
        }
        if (!batch.manufactureDate) {
          errors.push(
            `Item ${idx + 1}, Batch ${batchIdx + 1}: Missing manufacture date`,
          );
        } else {
          // Check if manufacture date is not in the future
          const mfgDate = new Date(batch.manufactureDate);
          mfgDate.setHours(0, 0, 0, 0);
          if (mfgDate > today) {
            errors.push(
              `Item ${idx + 1}, Batch ${batchIdx + 1}: Manufacture date cannot be in the future (selected: ${batch.manufactureDate})`,
            );
          }
        }
        if (!batch.expiryDate) {
          errors.push(
            `Item ${idx + 1}, Batch ${batchIdx + 1}: Missing expiry date`,
          );
        }
        if (batch.quantity <= 0) {
          errors.push(
            `Item ${idx + 1}, Batch ${batchIdx + 1}: Quantity must be > 0`,
          );
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const handleConfirmArrival = async () => {
    try {
      setError("");
      setIsLoading(true);

      if (!ticketData) {
        setError("Please load an order first");
        return;
      }

      // Validate all items before submission
      const validation = validateAllItems();
      if (!validation.valid) {
        setError(`Validation errors:\n${validation.errors.join("\n")}`);
        setIsLoading(false);
        return;
      }

      const importDetails = items.map((item) => ({
        importDetailId: item.id,
        acceptedQuantity: item.actualReceived,
        rejectQuantity: item.damaged,
        note: staffComments || null,
        batches: item.verifyBatches,
      }));

      // ✅ STEP 1: UPDATE quantity trước
      const updateDetails = items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.actualReceived,
        unitPrice: item.unitPrice,
      }));

      await receiveShipmentService.updateTicket(ticketData.id, {
        supplierId: ticketData.supplierId,
        importDate: ticketData.importDate,
        importDetails: updateDetails,
      });

      // ✅ STEP 2: VERIFY (đổi status)
      await receiveShipmentService.verifyTicket(ticketData.id, importDetails);

      setError("");
      alert("Shipment verified successfully!");

      // Reset form after success
      setLoadedPO(false);
      setItems([]);
      setStaffComments("");
      setTicketData(null);
    } catch (err: any) {
      setError(err.message || "Failed to verify shipment");
    } finally {
      setIsLoading(false);
    }
  };

  const totalSkus = items.length;
  const verifiedCount = items.filter(
    (item) => getItemVerificationStatus(item).status !== "invalid",
  ).length;
  const totalUnitsExpected = items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 px-6 py-4 lg:px-10">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-red-600">PerfumeGPT</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors cursor-pointer bg-none border-none p-0"
            >
              Dashboard
            </button>
            <a
              className="text-sm font-semibold text-red-600 underline"
              href="#"
            >
              Shipments
            </a>
            <a
              className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors"
              href="#"
            >
              Inventory
            </a>
            <a
              className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors"
              href="#"
            >
              Reports
            </a>
          </nav>
          <div className="w-10 h-10 rounded-full bg-gray-300"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 py-8 lg:px-10">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Receive Shipment Confirmation
          </h1>
          <p className="text-gray-500 text-base">
            Verify incoming goods against Purchase Order data for inventory
            reconciliation.
          </p>
        </div>

        {/* PO Number Input */}
        <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest">
              Import Tickets
            </label>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded border border-gray-200 bg-white text-gray-900 text-sm font-semibold focus:border-red-500 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="InProgress">In Progress</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          {loadingTickets ? (
            <div className="text-center py-4 text-gray-500">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No tickets found{" "}
              {selectedStatus ? `with status "${selectedStatus}"` : ""}
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    ticketData?.id === ticket.id
                      ? "bg-red-50 border-red-300"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <button
                    onClick={() => handleSelectTicket(ticket.id)}
                    disabled={isLoading}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold text-gray-900">
                      {ticket.supplierName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ID: {ticket.id} | Date:{" "}
                      {new Date(ticket.importDate).toLocaleDateString()} |
                      Items: {ticket.totalItems}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteTicket(ticket.id)}
                    disabled={isLoading}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Delete ticket"
                  >
                    🗑️
                  </button>
                </div>
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
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Arrival Confirmation - PO #882910
                    </h2>
                    <div className="text-xs text-gray-600 mt-1">
                      Status:{" "}
                      <span className="font-bold text-blue-600">
                        {ticketData?.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {ticketData?.status === "Pending" && (
                    <button
                      onClick={handleUpdateTicketStatus}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ➜ Update to In Progress
                    </button>
                  )}
                  <a
                    href="#"
                    className="text-xs text-red-600 font-bold hover:underline pt-2"
                  >
                    View Original PO ↗
                  </a>
                </div>
              </div>
              <div className="flex gap-8 mt-3 text-xs">
                <div>
                  <span className="text-gray-600">SUPPLIER: </span>
                  {!isEditMode && (
                    <span className="font-bold text-gray-900">
                      {ticketData?.supplierName || "-"}
                    </span>
                  )}
                  {isEditMode && (
                    <input
                      type="number"
                      value={ticketData?.supplierId ?? ""}
                      onChange={(e) =>
                        handleEditTicketField("supplierId", e.target.value)
                      }
                      className="ml-2 w-24 px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 focus:border-red-500 focus:outline-none"
                      min="1"
                    />
                  )}
                </div>
                <div>
                  <span className="text-gray-600">DATE: </span>
                  {!isEditMode && (
                    <span className="font-bold text-gray-900">
                      {ticketData?.importDate
                        ? new Date(ticketData.importDate).toLocaleDateString()
                        : "-"}
                    </span>
                  )}
                  {isEditMode && (
                    <input
                      type="date"
                      value={
                        ticketData?.importDate
                          ? ticketData.importDate.split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        handleEditTicketField("importDate", e.target.value)
                      }
                      className="ml-2 px-2 py-1 border border-gray-200 rounded bg-white text-gray-900 focus:border-red-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">
                      Verified
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">
                      Product SKU / Item
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">
                      Ordered Qty (As per PO)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">
                      Unit Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-red-600">
                      Actual Received
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-red-600">
                      Damaged/Rejected
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600">
                      Batches
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const verificationStatus = getItemVerificationStatus(item);
                    const statusColors = {
                      valid: "text-green-600",
                      warning: "text-amber-600",
                      invalid: "text-red-600",
                    };
                    return (
                      <tr
                        key={idx}
                        className="border-b border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`text-2xl font-bold ${statusColors[verificationStatus.status]}`}
                            >
                              {verificationStatus.icon}
                            </div>
                            <div className="text-xs text-gray-600 text-center max-w-[80px]">
                              {verificationStatus.reason}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">
                            {item.variantName}
                          </div>
                          <div className="text-xs text-gray-500">
                            SKU {item.variantSku}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-gray-900">
                          {!isEditMode && `${item.quantity} units`}
                          {isEditMode && (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleEditItemField(
                                  idx,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              className="w-24 px-3 py-2 rounded border border-gray-200 bg-white text-gray-900 font-semibold focus:border-red-500 focus:outline-none text-center"
                              min="0"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-gray-900">
                          {!isEditMode && item.unitPrice}
                          {isEditMode && (
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleEditItemField(
                                  idx,
                                  "unitPrice",
                                  e.target.value,
                                )
                              }
                              className="w-24 px-3 py-2 rounded border border-gray-200 bg-white text-gray-900 font-semibold focus:border-red-500 focus:outline-none text-center"
                              min="0"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-24 px-3 py-2 rounded border border-gray-200 bg-gray-100 text-gray-900 font-semibold text-center">
                            {item.actualReceived}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            (Auto-calculated)
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-24 px-3 py-2 rounded border border-gray-200 bg-gray-100 text-gray-900 font-semibold text-center">
                            {item.damaged}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            (Auto-calculated)
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openBatchModal(idx)}
                            className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-semibold text-sm transition-colors"
                          >
                            📋 {item.verifyBatches.length} batch
                            {item.verifyBatches.length !== 1 ? "es" : ""}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Batch Modal */}
        {showBatchModal && editingItemIdx >= 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">
                  Edit Batch Details - {items[editingItemIdx].variantName}
                </h2>
                <button
                  onClick={closeBatchModal}
                  className="text-2xl text-gray-600 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {items[editingItemIdx].verifyBatches.map((batch, batchIdx) => (
                  <div
                    key={batchIdx}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        Batch #{batchIdx + 1}
                      </h3>
                      <button
                        onClick={() => deleteBatch(batchIdx)}
                        className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded font-bold text-sm transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
                          Batch Code
                        </label>
                        <input
                          type="text"
                          value={batch.batchCode}
                          onChange={(e) =>
                            handleBatchChange(
                              editingItemIdx,
                              batchIdx,
                              "batchCode",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-gray-900 focus:border-red-500 focus:outline-none"
                          placeholder="e.g., B20240115001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
                          Manufacture Date
                        </label>
                        <input
                          type="date"
                          value={batch.manufactureDate}
                          onChange={(e) =>
                            handleBatchChange(
                              editingItemIdx,
                              batchIdx,
                              "manufactureDate",
                              e.target.value,
                            )
                          }
                          className={`w-full px-3 py-2 border rounded bg-white text-gray-900 focus:outline-none ${
                            batch.manufactureDate &&
                            new Date(batch.manufactureDate) > new Date()
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-200 focus:border-red-500"
                          }`}
                          max={new Date().toISOString().split("T")[0]}
                        />
                        {batch.manufactureDate &&
                          new Date(batch.manufactureDate) > new Date() && (
                            <div className="text-xs text-red-600 mt-1">
                              ⚠️ Cannot be in the future
                            </div>
                          )}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={batch.expiryDate}
                          onChange={(e) =>
                            handleBatchChange(
                              editingItemIdx,
                              batchIdx,
                              "expiryDate",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-gray-900 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={batch.quantity}
                          onChange={(e) =>
                            handleBatchChange(
                              editingItemIdx,
                              batchIdx,
                              "quantity",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded bg-white text-gray-900 focus:border-red-500 focus:outline-none"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addNewBatch}
                className="mt-6 w-full px-4 py-3 bg-green-50 text-green-600 hover:bg-green-100 border-2 border-dashed border-green-300 rounded-lg font-bold transition-colors"
              >
                ✚ Add New Batch
              </button>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={closeBatchModal}
                  className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments and Summary */}
        {loadedPO && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-3 uppercase tracking-widest">
                Staff Comments / Discrepancy Notes
              </label>
              <textarea
                value={staffComments}
                onChange={(e) => setStaffComments(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:border-red-500 focus:outline-none h-32 resize-none"
                placeholder="Describe any damaged packaging, missing items, or delivery issues here..."
              />
            </div>

            {/* Verification Summary */}
            <div className="bg-red-50 rounded-lg p-6 border-2 border-red-100">
              <h3 className="text-lg font-black text-red-600 mb-4">
                Verification Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total SKUs:</span>
                  <span className="font-semibold text-gray-900">
                    {totalSkus}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verified:</span>
                  <span className="font-semibold text-gray-900">
                    {verifiedCount} / {totalSkus}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Units Expected:</span>
                  <span className="font-semibold text-gray-900">
                    {totalUnitsExpected}
                  </span>
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

      {error && (
        <div className="fixed top-20 left-0 right-0 mx-auto max-w-2xl bg-red-50 border-l-4 border-red-600 p-4 rounded shadow-lg">
          <div className="flex gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">Validation Error</h3>
              <div className="text-sm text-red-800 whitespace-pre-line">
                {error}
              </div>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-900 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-6">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm font-bold text-gray-500">
            Active Inspector: Dang Khoa (Warehouse-B)
          </p>
          <div className="flex gap-4 w-full sm:w-auto">
            {!isEditMode && (
              <>
                <button className="flex-1 sm:flex-none px-10 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                  SAVE DRAFT
                </button>
                {ticketData?.status === "Pending" && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    disabled={isLoading || !loadedPO}
                    className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✎ EDIT
                  </button>
                )}
                <button
                  onClick={handleConfirmArrival}
                  disabled={isLoading || !loadedPO}
                  className="flex-1 sm:flex-none px-8 py-3 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "✓ CONFIRM ARRIVAL"}
                </button>
              </>
            )}
            {isEditMode && (
              <>
                <button
                  onClick={() => setIsEditMode(false)}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✕ CANCEL
                </button>
                <button
                  onClick={handleUpdateTicket}
                  disabled={isLoading || !loadedPO}
                  className="flex-1 sm:flex-none px-8 py-3 bg-green-600 text-white font-black rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "✓ UPDATE TICKET"}
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ReceiveShipmentPage;
