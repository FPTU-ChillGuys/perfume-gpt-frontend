import React, { useState, useEffect } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import {
  importStockService,
  type ImportTicket,
  type ImportTicketDetail,
  type VerifyBatch,
} from "../services/importStockService";
import { Snackbar, Alert } from "@mui/material";
import { Close, Check, Delete } from "@mui/icons-material";

interface BatchInput extends VerifyBatch {
  tempId: string;
}

interface ProductWithBatches {
  id: string;
  variantId: string;
  variantName: string;
  variantSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rejectQuantity: number;
  note: string | null;
  batches: BatchInput[];
  isExpanded: boolean;
}

const ReceiveImportStock: React.FC = () => {
  const [tickets, setTickets] = useState<ImportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] =
    useState<ImportTicketDetail | null>(null);
  const [products, setProducts] = useState<ProductWithBatches[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "Pending" | "InProgress" | "All"
  >("All");
  const [staffNote, setStaffNote] = useState("");
  const [allItemsVerified, setAllItemsVerified] = useState(false);
  const pageSize = 10;
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "info" });

  const showToast = (
    message: string,
    severity: "success" | "error" | "warning" | "info" = "info",
  ) => {
    setToast({ open: true, message, severity });
  };

  // Load tickets on mount
  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);

        // Fetch both Pending and InProgress tickets
        const pendingPromise = importStockService.getImportTickets(
          currentPage,
          pageSize,
          "Pending",
        );
        const inProgressPromise = importStockService.getImportTickets(
          currentPage,
          pageSize,
          "InProgress",
        );

        const [pendingResponse, inProgressResponse] = await Promise.all([
          pendingPromise,
          inProgressPromise,
        ]);

        // Combine and sort by date
        const allTickets = [
          ...pendingResponse.payload.items,
          ...inProgressResponse.payload.items,
        ].sort(
          (a, b) =>
            new Date(b.importDate).getTime() - new Date(a.importDate).getTime(),
        );

        setTickets(allTickets);
        // Use the total pages from pending for pagination (or calculate combined)
        setTotalPages(
          Math.max(
            pendingResponse.payload.totalPages,
            inProgressResponse.payload.totalPages,
          ),
        );
      } catch (error: any) {
        showToast(error.message || "Không thể tải danh sách đơn hàng", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, [currentPage]);

  const handleSelectTicket = async (ticketId: string) => {
    try {
      setIsLoading(true);
      const response = await importStockService.getImportTicketDetail(ticketId);
      setSelectedTicket(response.payload);

      // Initialize products with batches
      const productsWithBatches: ProductWithBatches[] =
        response.payload.importDetails.map((detail) => ({
          ...detail,
          batches: detail.batches.map((batch, idx) => ({
            batchCode: batch.batchCode,
            manufactureDate: batch.manufactureDate.split("T")[0],
            expiryDate: batch.expiryDate.split("T")[0],
            quantity: batch.importQuantity,
            tempId: `${detail.id}-${idx}`,
          })),
          isExpanded: false,
        }));
      setProducts(productsWithBatches);
      setStaffNote("");
      setAllItemsVerified(false);
    } catch (error: any) {
      showToast(error.message || "Không thể tải chi tiết đơn hàng", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChecking = async () => {
    if (!selectedTicket) return;

    try {
      setIsLoading(true);
      await importStockService.updateTicketStatus(
        selectedTicket.id,
        "InProgress",
      );

      // Update selected ticket status
      setSelectedTicket({ ...selectedTicket, status: "InProgress" });

      // Switch filter to InProgress tab
      setStatusFilter("InProgress");

      // Reload tickets to reflect status change in the list
      const pendingPromise = importStockService.getImportTickets(
        currentPage,
        pageSize,
        "Pending",
      );
      const inProgressPromise = importStockService.getImportTickets(
        currentPage,
        pageSize,
        "InProgress",
      );

      const [pendingResponse, inProgressResponse] = await Promise.all([
        pendingPromise,
        inProgressPromise,
      ]);

      const allTickets = [
        ...pendingResponse.payload.items,
        ...inProgressResponse.payload.items,
      ].sort(
        (a, b) =>
          new Date(b.importDate).getTime() - new Date(a.importDate).getTime(),
      );

      setTickets(allTickets);
      setTotalPages(
        Math.max(
          pendingResponse.payload.totalPages,
          inProgressResponse.payload.totalPages,
        ),
      );

      showToast("Đã bắt đầu kiểm tra đơn hàng", "success");
    } catch (error: any) {
      showToast(error.message || "Không thể cập nhật trạng thái", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProductExpand = (productId: string) => {
    setProducts(
      products.map((p) =>
        p.id === productId ? { ...p, isExpanded: !p.isExpanded } : p,
      ),
    );
  };

  const addBatch = (productId: string) => {
    setProducts(
      products.map((p) => {
        if (p.id === productId) {
          const newBatch: BatchInput = {
            batchCode: "",
            manufactureDate: "",
            expiryDate: "",
            quantity: 0,
            tempId: `${productId}-${Date.now()}`,
          };
          return { ...p, batches: [...p.batches, newBatch] };
        }
        return p;
      }),
    );
  };

  const updateBatch = (
    productId: string,
    tempId: string,
    field: keyof VerifyBatch,
    value: string | number,
  ) => {
    setProducts(
      products.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            batches: p.batches.map((b) =>
              b.tempId === tempId ? { ...b, [field]: value } : b,
            ),
          };
        }
        return p;
      }),
    );
  };

  const deleteBatch = (productId: string, tempId: string) => {
    setProducts(
      products.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            batches: p.batches.filter((b) => b.tempId !== tempId),
          };
        }
        return p;
      }),
    );
  };

  const handleConfirm = async () => {
    if (!selectedTicket) return;

    // Validate
    for (const product of products) {
      if (product.batches.length === 0) {
        showToast(
          `Sản phẩm "${product.variantName}" chưa có batch nào`,
          "warning",
        );
        return;
      }

      for (const batch of product.batches) {
        if (
          !batch.batchCode ||
          !batch.manufactureDate ||
          !batch.expiryDate ||
          batch.quantity < 0
        ) {
          showToast(
            `Vui lòng điền đầy đủ thông tin batch cho "${product.variantName}"`,
            "warning",
          );
          return;
        }
      }
    }

    try {
      setIsLoading(true);

      const verifyData = {
        importDetails: products.map((p) => {
          const totalBatchQuantity = p.batches.reduce(
            (sum, b) => sum + Number(b.quantity),
            0,
          );
          const rejectQuantity = Math.max(0, p.quantity - totalBatchQuantity);

          return {
            importDetailId: p.id,
            rejectQuantity,
            note: staffNote || null,
            batches: p.batches.map((b) => ({
              batchCode: b.batchCode,
              manufactureDate: b.manufactureDate,
              expiryDate: b.expiryDate,
              quantity: Number(b.quantity),
            })),
          };
        }),
      };

      await importStockService.verifyTicket(selectedTicket.id, verifyData);
      showToast("Xác nhận đơn hàng thành công!", "success");

      // Reset
      setSelectedTicket(null);
      setProducts([]);
      setStaffNote("");
      setAllItemsVerified(false);

      // Reload tickets
      try {
        const pendingPromise = importStockService.getImportTickets(
          currentPage,
          pageSize,
          "Pending",
        );
        const inProgressPromise = importStockService.getImportTickets(
          currentPage,
          pageSize,
          "InProgress",
        );

        const [pendingResponse, inProgressResponse] = await Promise.all([
          pendingPromise,
          inProgressPromise,
        ]);

        const allTickets = [
          ...pendingResponse.payload.items,
          ...inProgressResponse.payload.items,
        ].sort(
          (a, b) =>
            new Date(b.importDate).getTime() - new Date(a.importDate).getTime(),
        );

        setTickets(allTickets);
        setTotalPages(
          Math.max(
            pendingResponse.payload.totalPages,
            inProgressResponse.payload.totalPages,
          ),
        );
      } catch (err: any) {
        console.error("Failed to reload tickets:", err);
      }
    } catch (error: any) {
      showToast(error.message || "Không thể xác nhận đơn hàng", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate summary stats
  const verifiedCount = products.filter((p) => p.batches.length > 0).length;

  const damagedCount = products.reduce((sum, p) => {
    // Only calculate damaged if product has batches (has been checked)
    if (p.batches.length === 0) return sum;

    const totalBatch = p.batches.reduce((s, b) => s + Number(b.quantity), 0);
    return sum + Math.max(0, p.quantity - totalBatch);
  }, 0);

  const expectedTotal = products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Tickets List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Danh sách đơn nhập hàng
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStatusFilter("All");
                    setSelectedTicket(null);
                    setProducts([]);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    statusFilter === "All"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("Pending");
                    setSelectedTicket(null);
                    setProducts([]);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    statusFilter === "Pending"
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Chờ xử lý
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("InProgress");
                    setSelectedTicket(null);
                    setProducts([]);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    statusFilter === "InProgress"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Đang kiểm tra
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {isLoading && !selectedTicket ? (
              <div className="text-center py-8 text-gray-500">Đang tải...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Không có đơn hàng nào đang chờ
              </div>
            ) : tickets.filter((ticket) =>
                statusFilter === "All" ? true : ticket.status === statusFilter,
              ).length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Không có đợt nhập hàng
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter === "Pending"
                    ? "Không có đợt nào đang chờ xử lý"
                    : statusFilter === "InProgress"
                      ? "Không có đợt nào đang kiểm tra"
                      : "Không có đợt nhập hàng nào"}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {tickets
                    .filter((ticket) =>
                      statusFilter === "All"
                        ? true
                        : ticket.status === statusFilter,
                    )
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleSelectTicket(ticket.id)}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedTicket?.id === ticket.id
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {ticket.supplierName}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              ID: {ticket.id.substring(0, 8)}... | Ngày:{" "}
                              {new Date(ticket.importDate).toLocaleDateString(
                                "vi-VN",
                              )}{" "}
                              | Số sản phẩm: {ticket.totalItems}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                                ticket.status === "Pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : ticket.status === "InProgress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                              }`}
                            >
                              {ticket.status === "Pending"
                                ? "Chờ xử lý"
                                : ticket.status === "InProgress"
                                  ? "Đang kiểm tra"
                                  : "Hoàn thành"}
                            </span>
                            <p className="text-sm font-bold text-gray-900 mt-2">
                              {ticket.totalCost.toLocaleString("vi-VN")} ₫
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    <span className="text-sm text-gray-600">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        {selectedTicket && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Xác nhận nhập hàng - PO #
                    {selectedTicket.id.substring(0, 8).toUpperCase()}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="font-semibold text-gray-600">
                      NHÀ CUNG CẤP:
                    </span>
                    <span className="uppercase text-gray-900 font-medium">
                      {selectedTicket.supplierName}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600">
                      {new Date(selectedTicket.importDate).toLocaleDateString(
                        "vi-VN",
                      )}
                    </span>
                  </div>
                </div>
                {selectedTicket.status === "Pending" && (
                  <button
                    onClick={handleStartChecking}
                    disabled={isLoading}
                    className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  >
                    Bắt đầu kiểm tra
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-12 gap-6">
                {/* Main Content - Products Table */}
                <div className="col-span-8">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gray-50 border-b border-gray-200">
                      <div className="grid grid-cols-12 gap-4 px-4 py-3">
                        <div className="col-span-1 flex items-center justify-center"></div>
                        <div className="col-span-5">
                          <span className="text-xs font-bold text-gray-600 uppercase">
                            Sản phẩm / Mã SKU
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold text-gray-600 uppercase">
                            Số lượng đặt
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold text-gray-600 uppercase">
                            Đã nhận
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-xs font-bold text-gray-600 uppercase">
                            Hỏng hóc
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-200">
                      {products.map((product) => {
                        const totalBatchQty = product.batches.reduce(
                          (sum, b) => sum + Number(b.quantity),
                          0,
                        );
                        // Only calculate damaged if product has batches
                        const damagedQty =
                          product.batches.length > 0
                            ? Math.max(0, product.quantity - totalBatchQty)
                            : 0;

                        return (
                          <div key={product.id}>
                            {/* Product Row */}
                            <div className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50">
                              <div className="col-span-1 flex items-center justify-center">
                                {product.batches.length > 0 ? (
                                  <Check
                                    sx={{ fontSize: 20, color: "#16a34a" }}
                                  />
                                ) : (
                                  <Close
                                    sx={{ fontSize: 20, color: "#dc2626" }}
                                  />
                                )}
                              </div>
                              <div className="col-span-5">
                                <div className="font-semibold text-gray-900">
                                  {product.variantName}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {product.variantSku}
                                </div>
                                {selectedTicket.status === "InProgress" && (
                                  <button
                                    onClick={() =>
                                      toggleProductExpand(product.id)
                                    }
                                    className="text-xs text-red-600 hover:text-red-700 font-semibold mt-2 inline-flex items-center gap-1"
                                  >
                                    {product.isExpanded ? "▼" : "▶"} Chi tiết
                                    batch
                                  </button>
                                )}
                              </div>
                              <div className="col-span-2 flex items-center justify-center">
                                <span className="font-semibold text-gray-900">
                                  {product.quantity}
                                </span>
                                <span className="text-sm text-gray-500 ml-1">
                                  units
                                </span>
                              </div>
                              <div className="col-span-2 flex items-center justify-center">
                                <span
                                  className={`font-bold ${
                                    totalBatchQty > 0
                                      ? totalBatchQty === product.quantity
                                        ? "text-green-600"
                                        : "text-yellow-600"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {totalBatchQty}
                                </span>
                              </div>
                              <div className="col-span-2 flex items-center justify-center">
                                <span
                                  className={`font-bold ${
                                    damagedQty > 0
                                      ? "text-red-600"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {damagedQty}
                                </span>
                              </div>
                            </div>

                            {/* Batch Details (Expandable) */}
                            {product.isExpanded &&
                              selectedTicket.status === "InProgress" && (
                                <div className="bg-gray-50 px-4 py-4 border-t border-gray-100">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    Quản lý Batch
                                  </h4>
                                  <div className="space-y-2">
                                    {product.batches.map((batch) => (
                                      <div
                                        key={batch.tempId}
                                        className="grid grid-cols-12 gap-3 items-center p-3 bg-white rounded-lg border border-gray-200"
                                      >
                                        <div className="col-span-3">
                                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                            Mã batch
                                          </label>
                                          <input
                                            type="text"
                                            value={batch.batchCode}
                                            onChange={(e) =>
                                              updateBatch(
                                                product.id,
                                                batch.tempId,
                                                "batchCode",
                                                e.target.value,
                                              )
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:outline-none"
                                            placeholder="BATCH001"
                                          />
                                        </div>
                                        <div className="col-span-3">
                                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                            Ngày sản xuất
                                          </label>
                                          <input
                                            type="date"
                                            value={batch.manufactureDate}
                                            onChange={(e) =>
                                              updateBatch(
                                                product.id,
                                                batch.tempId,
                                                "manufactureDate",
                                                e.target.value,
                                              )
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:outline-none"
                                          />
                                        </div>
                                        <div className="col-span-3">
                                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                            Ngày hết hạn
                                          </label>
                                          <input
                                            type="date"
                                            value={batch.expiryDate}
                                            onChange={(e) =>
                                              updateBatch(
                                                product.id,
                                                batch.tempId,
                                                "expiryDate",
                                                e.target.value,
                                              )
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:outline-none"
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                            Số lượng
                                          </label>
                                          <input
                                            type="number"
                                            value={batch.quantity}
                                            onChange={(e) =>
                                              updateBatch(
                                                product.id,
                                                batch.tempId,
                                                "quantity",
                                                Number(e.target.value),
                                              )
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:outline-none"
                                            min="0"
                                          />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                          <button
                                            onClick={() =>
                                              deleteBatch(
                                                product.id,
                                                batch.tempId,
                                              )
                                            }
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Xóa batch"
                                          >
                                            <Delete fontSize="small" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => addBatch(product.id)}
                                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 font-semibold transition-colors text-sm"
                                    >
                                      + Thêm batch
                                    </button>
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Staff Comments */}
                  {selectedTicket.status === "InProgress" && (
                    <div className="mt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        GHI CHÚ NHÂN VIÊN / BÁO CÁO SAI LỆCH
                      </label>
                      <textarea
                        value={staffNote}
                        onChange={(e) => setStaffNote(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none resize-none"
                        placeholder="Mô tả bất kỳ sự cố về bao bì, sản phẩm bị thiếu, hoặc vấn đề giao hàng..."
                      />
                    </div>
                  )}
                </div>

                {/* Verification Summary Sidebar */}
                <div className="col-span-4">
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5 sticky top-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                      Tổng quan xác nhận
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-red-200">
                        <span className="text-sm font-semibold text-gray-600">
                          Tổng SKU
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {products.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-red-200">
                        <span className="text-sm font-semibold text-gray-600">
                          Đã xác nhận
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          {verifiedCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-red-200">
                        <span className="text-sm font-semibold text-gray-600">
                          Hỏng hóc
                        </span>
                        <span className="text-xl font-bold text-red-600">
                          {damagedCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-semibold text-gray-600">
                          Theo dự kiến
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {expectedTotal}
                        </span>
                      </div>
                    </div>

                    {selectedTicket.status === "InProgress" && (
                      <div className="mt-6 pt-4 border-t-2 border-red-200 text-center">
                        <label className="align-middle items-center cursor-pointer">
                          <span className="text-sm font-semibold text-red-700">
                            TẤT CẢ SẢN PHẨM PHẢI ĐƯỢC XÁC NHẬN
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            {selectedTicket.status === "InProgress" && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end items-center">
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    "XÁC NHẬN NHẬP HÀNG"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
};

export default ReceiveImportStock;
