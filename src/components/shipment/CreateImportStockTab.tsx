import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { importStockService } from "../../services/importStockService";
import { productService } from "../../services/productService";
import {
  sourcingCatalogService,
  type CatalogItem,
} from "../../services/sourcingCatalogService";
import type { Supplier } from "@/types/product";
import {
  Inventory2,
  Add,
  Delete,
  ReceiptLong,
  Info,
  CloudUpload,
  FileDownload,
} from "@mui/icons-material";
import { Snackbar, Alert } from "@mui/material";

interface ImportStockItem {
  variantId: string;
  quantity: number;
  price: number;
}

const getTodayIsoDate = () => new Date().toISOString().split("T")[0];

export const CreateImportStockTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ImportStockItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState<string>(
    () => getTodayIsoDate()!,
  );
  const [variants, setVariants] = useState<CatalogItem[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(true);
  const [loadingVariants, setLoadingVariants] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "info" });
  const [uploadingExcel, setUploadingExcel] = useState<boolean>(false);
  const [downloadingTemplate, setDownloadingTemplate] =
    useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [hasProcessedImportData, setHasProcessedImportData] =
    useState<boolean>(false);

  const showToast = useCallback(
    (
      message: string,
      severity: "success" | "error" | "warning" | "info" = "info",
    ) => {
      setToast({ open: true, message, severity });
    },
    [],
  );

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  // Parse import data from URL query params (from restock suggestions)
  useEffect(() => {
    const importDataParam = searchParams.get("importData");
    const tabParam = searchParams.get("tab");

    if (importDataParam && !hasProcessedImportData) {
      try {
        // Decode base64 and parse JSON
        const decodedData = atob(importDataParam);
        const importItems = JSON.parse(decodedData) as Array<{
          variantId: string;
          quantity: number;
          price: number;
        }>;

        if (importItems && importItems.length > 0) {
          // Set items from restock suggestions
          setItems(importItems);

          // Clear the importData param from URL after processing
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete("importData");
          setSearchParams(newParams);

          // Set hasProcessed flag to avoid re-processing
          setHasProcessedImportData(true);

          // Show success toast
          showToast(
            `Đã tải ${importItems.length} sản phẩm từ gợi ý nhập hàng. Bạn có thể chỉnh sửa trước khi tạo đơn.`,
            "success",
          );
        }
      } catch (error) {
        console.error("Failed to parse import data from URL:", error);
        showToast(
          "Dữ liệu nhập hàng không hợp lệ. Vui lòng nhập thủ công.",
          "warning",
        );
      }
    }

    // Handle tab navigation if specified
    if (tabParam) {
      const tabValue = parseInt(tabParam, 10);
      if (!isNaN(tabValue)) {
        // This will be handled by parent component's tab state
        // We just need to ensure the tab is active
      }
    }
  }, [searchParams, hasProcessedImportData, showToast, setSearchParams]);

  // Load suppliers on mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const supplierList = await productService.getSuppliers();
        setSuppliers(supplierList);
        if (supplierList.length > 0) {
          setSelectedSupplierId(supplierList[0]!.id!);
        }
      } catch (err: any) {
        showToast(
          err.message || "Không thể tải danh sách nhà cung cấp",
          "error",
        );
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, [showToast]);

  // Load catalog items when supplier changes
  useEffect(() => {
    const loadCatalog = async () => {
      if (!selectedSupplierId) {
        setVariants([]);
        return;
      }

      try {
        setLoadingVariants(true);
        const catalogItems =
          await sourcingCatalogService.getCatalog(selectedSupplierId);
        setVariants(catalogItems);
      } catch (err: any) {
        console.error("Failed to load catalog:", err);
        showToast(
          err.message || "Không thể tải danh mục sản phẩm của nhà cung cấp",
          "error",
        );
        setVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    };

    loadCatalog();
  }, [selectedSupplierId, showToast]);

  const triggerExcelPicker = () => {
    fileInputRef.current?.click();
  };

  const handleExcelFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      showToast("Vui lòng chọn file Excel đúng định dạng", "warning");
      event.target.value = "";
      return;
    }

    if (!selectedSupplierId) {
      showToast("Vui lòng chọn nhà cung cấp trước", "warning");
      event.target.value = "";
      return;
    }

    if (!expectedArrivalDate) {
      showToast("Vui lòng chọn ngày dự kiến nhận", "warning");
      event.target.value = "";
      return;
    }

    try {
      setUploadingExcel(true);
      const excelPayload = await importStockService.uploadImportTicketsExcel(
        file,
        selectedSupplierId,
        expectedArrivalDate,
      );

      const mappedItems: ImportStockItem[] = (excelPayload.importDetails || [])
        .map((detail) => ({
          variantId: detail.variantId || "",
          quantity: Number(detail.expectedQuantity || 0),
          price: Number(detail.unitPrice || 0),
        }))
        .filter((item) => Boolean(item.variantId));

      if (mappedItems.length === 0) {
        showToast(
          "File Excel không có dòng hợp lệ để hiển thị. Vui lòng kiểm tra lại dữ liệu.",
          "warning",
        );
      } else {
        setItems(mappedItems);
        showToast(
          `Đã tải ${mappedItems.length} sản phẩm từ Excel. Bạn có thể chỉnh sửa trước khi tạo đơn.`,
          "success",
        );
      }

      if (typeof excelPayload.supplierId === "number") {
        setSelectedSupplierId(excelPayload.supplierId);
      }

      if (excelPayload.expectedArrivalDate) {
        setExpectedArrivalDate(excelPayload.expectedArrivalDate.split("T")[0]!);
      }
    } catch (err: any) {
      showToast(err.message || "Không thể nhập đơn từ Excel", "error");
    } finally {
      setUploadingExcel(false);
      event.target.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const blob = await importStockService.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "import-ticket-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Đã tải mẫu Excel", "success");
    } catch (err: any) {
      showToast(err.message || "Không thể tải mẫu Excel", "error");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleItemChange = (
    idx: number,
    field: keyof ImportStockItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    switch (field) {
      case "variantId":
        newItems[idx]!.variantId = String(value);
        break;
      case "quantity":
        newItems[idx]!.quantity = Number(value);
        break;
      case "price": {
        // Remove any non-digit characters for internal storage
        const numericValue = String(value).replace(/\D/g, "");
        newItems[idx]!.price = Number(numericValue);
        break;
      }
      default:
        break;
    }
    setItems(newItems);
  };

  const formatPriceInput = (price: number): string => {
    if (!price || price === 0) return "";
    return price.toLocaleString("vi-VN");
  };

  const handleAddItem = () => {
    setItems([...items, { variantId: "", quantity: 0, price: 0 }]);
  };

  const handleDeleteItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalUnits = items.reduce(
    (sum: number, item: ImportStockItem) => sum + item.quantity,
    0,
  );
  const grandTotal = items.reduce(
    (sum: number, item: ImportStockItem) => sum + item.quantity * item.price,
    0,
  );

  const handleCreateShipment = async () => {
    try {
      setIsLoading(true);

      if (items.length === 0) {
        showToast("Vui lòng thêm ít nhất một sản phẩm", "warning");
        return;
      }

      if (!expectedArrivalDate) {
        showToast("Vui lòng chọn ngày dự kiến nhận hàng", "warning");
        return;
      }

      // Validate all items have variantId
      const invalidItems = items.filter((item) => !item.variantId);
      if (invalidItems.length > 0) {
        showToast("Vui lòng chọn sản phẩm cho tất cả các dòng", "warning");
        return;
      }

      // Convert items to import details format using variantId from API
      const importDetails = items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      const importDate = getTodayIsoDate();

      if (new Date(expectedArrivalDate) < new Date(importDate!)) {
        showToast("Ngày dự kiến nhận không thể trước ngày tạo đơn", "warning");
        return;
      }

      // Call API
      await importStockService.createImportTicket(
        selectedSupplierId,
        importDetails,
        expectedArrivalDate,
      );

      showToast("Tạo đơn nhập hàng thành công!", "success");

      // Reset form after successful creation
      setItems([{ variantId: "", quantity: 0, price: 0 }]);
      setExpectedArrivalDate(getTodayIsoDate()!);
    } catch (err: any) {
      showToast(err.message || "Không thể tạo đơn nhập hàng", "error");
      console.error("Shipment creation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleExcelFileChange}
        accept=".xlsx,.xls"
        className="hidden"
      />
      {/* Supplier Selection */}
      <div className="mb-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Nhà Cung Cấp
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
            disabled={loadingSuppliers}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50 disabled:bg-gray-50 transition-all"
          >
            {loadingSuppliers ? (
              <option>Đang tải nhà cung cấp...</option>
            ) : (
              suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}{" "}
                  {supplier.contactEmail && `(${supplier.contactEmail})`}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Ngày dự kiến nhận hàng
          </label>
          <input
            type="date"
            value={expectedArrivalDate}
            min={getTodayIsoDate()}
            onChange={(e) => setExpectedArrivalDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-all"
          />
          <p className="text-xs text-gray-500 mt-2">
            Vui lòng chọn ngày kho dự kiến sẽ nhận hàng.
          </p>
        </div>

        <div className="pt-4 border-t border-dashed border-gray-200">
          <p className="block text-sm font-semibold text-gray-700 mb-3">
            Nhập nhanh bằng Excel
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="w-full sm:w-auto px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileDownload fontSize="small" />
              <span>
                {downloadingTemplate ? "Đang tải..." : "Tải form Excel"}
              </span>
            </button>
            <button
              type="button"
              onClick={triggerExcelPicker}
              disabled={uploadingExcel}
              className="w-full sm:w-auto px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-600 font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CloudUpload fontSize="small" />
              <span>{uploadingExcel ? "Đang nhập..." : "Nhập từ Excel"}</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Sử dụng mẫu Excel để lập danh sách sản phẩm, sau đó tải lên để tạo
            đơn nhanh chóng.
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipment Items Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Danh sách sản phẩm</span>
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                {items.length}
              </span>
            </h2>
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <Add fontSize="small" /> Thêm sản phẩm
            </button>
          </div>

          {/* Table */}
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <Inventory2 sx={{ fontSize: 80, color: "gray.300", mb: 2 }} />
              <p className="text-gray-500 font-medium">Chưa có sản phẩm nào</p>
              <p className="text-gray-400 text-sm mt-2">
                Nhấn "Thêm sản phẩm" để bắt đầu
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-125 overflow-y-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase"
                      style={{ width: "60px" }}
                    >
                      STT
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase"
                      style={{ width: "auto", minWidth: "300px" }}
                    >
                      Sản phẩm
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase"
                      style={{ width: "120px" }}
                    >
                      Số lượng
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase"
                      style={{ width: "180px" }}
                    >
                      Đơn giá
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold text-red-600 uppercase"
                      style={{ width: "180px" }}
                    >
                      Thành tiền
                    </th>
                    <th className="px-4 py-3" style={{ width: "60px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 text-center align-middle">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const selectedVariant = variants.find(
                              (variant) => variant.id === item.variantId,
                            );
                            const imageUrl = selectedVariant?.primaryImageUrl;

                            return imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={
                                  selectedVariant?.variantName ||
                                  selectedVariant?.variantSku ||
                                  "Variant image"
                                }
                                className="h-10 w-10 shrink-0 rounded-md border border-gray-200 object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-gray-400">
                                No Img
                              </div>
                            );
                          })()}
                          <select
                            value={item.variantId}
                            onChange={(e) => {
                              const newVariantId = e.target.value;

                              // Check for duplicate
                              if (newVariantId) {
                                const isDuplicate = items.some(
                                  (existingItem, existingIdx) =>
                                    existingIdx !== idx &&
                                    existingItem.variantId === newVariantId,
                                );

                                if (isDuplicate) {
                                  showToast(
                                    "Sản phẩm này đã được chọn. Vui lòng chọn sản phẩm khác.",
                                    "warning",
                                  );
                                  return;
                                }
                              }

                              const selectedVariant = variants.find(
                                (v) => v.id === newVariantId,
                              );
                              handleItemChange(idx, "variantId", newVariantId);
                              if (selectedVariant) {
                                handleItemChange(
                                  idx,
                                  "price",
                                  selectedVariant.negotiatedPrice ?? 0,
                                );
                              }
                            }}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-all"
                            disabled={loadingVariants || variants.length === 0}
                          >
                            <option value="">
                              {loadingVariants
                                ? "Đang tải..."
                                : variants.length === 0
                                  ? "Chưa có sản phẩm trong catalog"
                                  : "Chọn sản phẩm..."}
                            </option>
                            {variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.variantName ||
                                  variant.variantSku ||
                                  "Variant"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <input
                          type="text"
                          value={item.quantity || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            // Remove leading zeros
                            const cleanValue = value.replace(/^0+/, "") || "0";
                            handleItemChange(idx, "quantity", cleanValue);
                          }}
                          onBlur={(e) => {
                            // Ensure at least 0 on blur
                            if (!e.target.value || e.target.value === "0") {
                              handleItemChange(idx, "quantity", "0");
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-center focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-all"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <input
                          type="text"
                          value={formatPriceInput(item.price)}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            handleItemChange(idx, "price", value);
                          }}
                          onFocus={(e) => {
                            // Select all on focus for easy editing
                            e.target.select();
                          }}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 font-semibold text-right focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-all"
                          placeholder="0 VNĐ"
                        />
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-red-600 align-middle">
                        {(item.quantity * item.price).toLocaleString("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        })}
                      </td>
                      <td className="px-4 py-4 text-center align-middle">
                        <button
                          onClick={() => handleDeleteItem(idx)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Xóa"
                        >
                          <Delete fontSize="small" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Summary - Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm sticky top-6">
            <div className="px-6 py-4 bg-red-100 border-b border-red-200">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <ReceiptLong className="text-red-700" />
                <span>Tóm tắt đơn hàng</span>
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 text-sm font-medium">
                  Số loại sản phẩm:
                </span>
                <span className="font-bold text-gray-900 text-lg">
                  {items.length}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 text-sm font-medium">
                  Tổng số lượng:
                </span>
                <span className="font-bold text-gray-900 text-lg">
                  {totalUnits}
                </span>
              </div>
              <div className="pt-4 mt-4 border-t-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">Tổng cộng:</span>
                  <span className="font-bold text-red-600 text-xl">
                    {grandTotal.toLocaleString("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Info className="text-amber-600" fontSize="small" />
                  <p className="text-amber-700 text-xs font-medium leading-relaxed">
                    Kho hàng sẽ nhận được thông báo ngay sau khi đơn nhập hàng
                    được tạo thành công
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Actions */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
          <button
            onClick={handleCreateShipment}
            disabled={isLoading || items.length === 0}
            className="w-full sm:w-auto px-8 py-3.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 disabled:hover:shadow-md flex items-center justify-center gap-2"
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
              <>
                <span>Tạo đơn nhập hàng</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};
