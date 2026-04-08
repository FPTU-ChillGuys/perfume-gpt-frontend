import { CheckCircleRounded, OpenInNew } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { POS_HUB_URL, useSignalR } from "@/hooks/useSignalR";
import type { PosPreviewResponse } from "@/services/posService";
import { QRCodeSVG } from "qrcode.react";

const formatCurrency = (value?: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}đ`;

const readProp = <T,>(obj: unknown, camelKey: string, pascalKey: string) => {
  if (!obj || typeof obj !== "object") return undefined;
  const raw = obj as Record<string, unknown>;
  return (raw[camelKey] ?? raw[pascalKey]) as T | undefined;
};

type DisplayItem = {
  variantId?: string;
  variantName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  finalTotal: number;
};

const SUCCESS_OVERLAY_KEYFRAMES = `
@keyframes checkoutSuccessCard {
  0% { transform: translateY(10px) scale(0.94); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes checkoutSuccessPop {
  0% { transform: scale(0.7); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes checkoutSuccessRipple {
  0% { transform: scale(0.6); opacity: 0.55; }
  100% { transform: scale(1.45); opacity: 0; }
}
`;

export const CustomerDisplayScreen = () => {
  const { customerDisplayData, paymentCompletedData, paymentFailedData } =
    useSignalR<PosPreviewResponse>({
      hubUrl: POS_HUB_URL,
      sessionId: "COUNTER_01",
      requireAuth: false,
    });
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [activePaymentUrl, setActivePaymentUrl] = useState("");

  const items = useMemo<DisplayItem[]>(() => {
    const rawItems = readProp<unknown[]>(customerDisplayData, "items", "Items");

    if (!Array.isArray(rawItems)) return [];

    const normalizedItems = rawItems.map((item) => {
      const unitPrice = Number(
        readProp<number>(item, "unitPrice", "UnitPrice") ?? 0,
      );
      const quantity = Number(
        readProp<number>(item, "quantity", "Quantity") ?? 0,
      );

      return {
        variantId: readProp<string>(item, "variantId", "VariantId"),
        variantName:
          readProp<string>(item, "variantName", "VariantName") || "Sản phẩm",
        imageUrl: readProp<string>(item, "imageUrl", "ImageUrl"),
        quantity,
        unitPrice,
        finalTotal: Number(
          readProp<number>(item, "finalTotal", "FinalTotal") ??
            unitPrice * quantity,
        ),
      };
    });

    const groupedMap = new Map<string, DisplayItem>();

    normalizedItems.forEach((item) => {
      const groupKey = (item.variantId || "").trim() || item.variantName.trim();
      const existing = groupedMap.get(groupKey);

      if (!existing) {
        groupedMap.set(groupKey, { ...item });
        return;
      }

      existing.quantity += item.quantity;
      existing.finalTotal += item.finalTotal;

      if (!existing.imageUrl && item.imageUrl) {
        existing.imageUrl = item.imageUrl;
      }
    });

    return Array.from(groupedMap.values());
  }, [customerDisplayData]);

  const subTotal = useMemo(() => {
    const raw = readProp<number>(customerDisplayData, "subTotal", "SubTotal");
    if (typeof raw === "number") return raw;
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [customerDisplayData, items]);

  const discount = useMemo(() => {
    const raw = readProp<number>(customerDisplayData, "discount", "Discount");
    return Number(raw ?? 0);
  }, [customerDisplayData]);

  const finalTotal = useMemo(() => {
    const totalPrice = readProp<number>(
      customerDisplayData,
      "totalPrice",
      "TotalPrice",
    );
    const subTotal = readProp<number>(
      customerDisplayData,
      "subTotal",
      "SubTotal",
    );

    return Number(totalPrice ?? subTotal ?? 0);
  }, [customerDisplayData]);

  const paymentUrl = useMemo(() => {
    return (
      readProp<string>(customerDisplayData, "paymentUrl", "PaymentUrl") || ""
    ).trim();
  }, [customerDisplayData]);

  useEffect(() => {
    if (!paymentUrl) return;

    const frameId = window.requestAnimationFrame(() => {
      setActivePaymentUrl(paymentUrl);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [paymentUrl]);

  useEffect(() => {
    // A new non-empty cart with no payment URL indicates a new checkout flow.
    if (items.length === 0 || paymentUrl) return;

    const frameId = window.requestAnimationFrame(() => {
      setActivePaymentUrl("");
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [items.length, paymentUrl]);

  const displayPaymentUrl = activePaymentUrl || paymentUrl;

  useEffect(() => {
    if (!displayPaymentUrl) return;

    const frameId = window.requestAnimationFrame(() => {
      setShowCheckoutSuccess(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [displayPaymentUrl]);

  useEffect(() => {
    if (!showCheckoutSuccess) return;

    const timerId = window.setTimeout(() => {
      setShowCheckoutSuccess(false);
    }, 3200);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [showCheckoutSuccess]);

  useEffect(() => {
    if (!paymentCompletedData) return;

    // Bắt lỗi Casing
    const rawStatus =
      paymentCompletedData.status || (paymentCompletedData as any).Status || "";

    if (rawStatus.toLowerCase() !== "success") {
      return;
    }

    setActivePaymentUrl("");
    setShowCheckoutSuccess(true); // Nhảy tick xanh cho khách xem
  }, [paymentCompletedData]);

  useEffect(() => {
    if (!paymentFailedData) return;

    const rawStatus =
      paymentFailedData.status ||
      (paymentFailedData as { Status?: string }).Status ||
      "";
    const normalizedStatus = rawStatus.toLowerCase();

    if (normalizedStatus !== "failed" && normalizedStatus !== "error") {
      return;
    }

    setActivePaymentUrl("");
  }, [paymentFailedData]);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950 text-white">
      <style>{SUCCESS_OVERLAY_KEYFRAMES}</style>

      {displayPaymentUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
          <div className="mx-4 w-full max-w-md rounded-3xl bg-white p-7 text-center text-slate-900 shadow-2xl">
            <p className="text-2xl font-black text-sky-700">
              Vui lòng quét mã để thanh toán
            </p>
            <div className="mx-auto mt-4 w-fit rounded-2xl border border-slate-200 bg-white p-2">
              <QRCodeSVG value={displayPaymentUrl} size={240} />
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() =>
                window.open(displayPaymentUrl, "_blank", "noopener,noreferrer")
              }
            >
              <OpenInNew fontSize="small" />
              Mở link thanh toán (test)
            </button>
          </div>
        </div>
      )}

      {showCheckoutSuccess && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
          <div
            className="mx-4 w-full max-w-md rounded-3xl bg-white px-8 py-9 text-center text-slate-900"
            style={{
              width: "min(92vw, 440px)",
              boxShadow: "0 24px 60px rgba(2, 6, 23, 0.28)",
              animation: "checkoutSuccessCard 260ms ease-out",
            }}
          >
            <div className="relative mx-auto mb-3 flex h-[104px] w-[104px] items-center justify-center">
              <span
                className="absolute inset-2 rounded-full border-2 border-emerald-300/80"
                style={{
                  animation: "checkoutSuccessRipple 1.25s ease-out infinite",
                }}
              />
              <span
                className="absolute inset-2 rounded-full border-2 border-emerald-300/70"
                style={{
                  animation: "checkoutSuccessRipple 1.25s ease-out infinite",
                  animationDelay: "0.45s",
                }}
              />
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <CheckCircleRounded
                  className="text-emerald-600"
                  style={{
                    fontSize: 84,
                    animation: "checkoutSuccessPop 520ms ease-out",
                  }}
                />
              </div>
            </div>
            <p className="text-[30px] font-extrabold text-emerald-700">
              Thanh toán thành công
            </p>
            <p className="mt-2 text-base text-slate-600">
              Cảm ơn quý khách. Đơn hàng đã được xử lý.
            </p>
          </div>
        </div>
      )}

      <div className="grid h-full grid-cols-1 lg:grid-cols-3">
        <section className="relative lg:col-span-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.35),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(251,191,36,0.25),transparent_40%),linear-gradient(135deg,#111827,#020617_55%,#3f1d2e)]" />
          <div className="relative z-10 flex h-full flex-col justify-start p-8 md:p-12">
            <p className="mb-3 text-sm uppercase tracking-[0.35em] text-rose-200/80">
              PERFUME GPT BOUTIQUE
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-rose-50 md:text-6xl">
              Hương thơm đặc quyền cho phong cách của bạn
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-200/90 md:text-lg">
              Cảm ơn quý khách đã mua sắm. Đơn hàng của bạn sẽ được cập nhật
              theo thời gian thực tại màn hình này.
            </p>
          </div>
        </section>

        <aside className="flex h-full flex-col bg-white text-slate-900 lg:col-span-2">
          <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-2xl font-extrabold">Đơn hàng của bạn</h2>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                {items.length} món
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Cập nhật từ màn hình thu ngân theo thời gian thực
            </p>
          </div>

          {!customerDisplayData ? (
            <div className="flex flex-1 items-center justify-center px-8 text-center">
              <p className="text-xl font-semibold text-slate-500">
                Vui lòng chờ nhân viên quét mã sản phẩm...
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-base text-slate-500">
                    Chưa có sản phẩm trong giỏ hiển thị.
                  </p>
                ) : (
                  <ul className="space-y-3.5">
                    {items.map((item, index) => (
                      <li
                        key={`${item.variantId ?? "variant"}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.variantName}
                              className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-linear-to-br from-slate-100 to-slate-200 text-lg font-bold text-slate-500">
                              {(item.variantName || "S")
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">
                                {item.variantName || "Sản phẩm"}
                              </p>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                x{item.quantity ?? 0}
                              </span>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                                <p className="text-[11px] text-slate-500">
                                  Đơn giá
                                </p>
                                <p className="font-semibold text-slate-800">
                                  {formatCurrency(item.unitPrice)}
                                </p>
                              </div>
                              <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-right">
                                <p className="text-[11px] text-rose-500">
                                  Thành tiền
                                </p>
                                <p className="font-bold text-rose-700">
                                  {formatCurrency(item.finalTotal)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-6">
                <div className="mb-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Tạm tính</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(subTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Giảm giá</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(discount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-slate-200 pt-3">
                  <span className="text-lg font-semibold text-slate-700">
                    Tổng thanh toán
                  </span>
                  <span className="text-5xl font-extrabold leading-none text-red-600">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
