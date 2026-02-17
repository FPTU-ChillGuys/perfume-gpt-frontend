import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { checkoutSteps } from "@/data/checkoutSample";
import { cartService } from "@/services/cartService";
import { voucherService } from "@/services/voucherService";
import type { CartItem, CartTotals } from "@/types/cart";
import { useToast } from "@/hooks/useToast";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN").format(Number(value ?? 0)) + "đ";

const checkoutPreviewLinks = [
  {
    id: 1,
    title: "Delivery",
    description: "Confirm address & method",
    href: "/checkout/shipping",
  },
  {
    id: 2,
    title: "Packaging",
    description: "Choose our signature wrap",
    href: "/checkout/packaging",
  },
  {
    id: 3,
    title: "Payment",
    description: "Secure payment methods",
    href: "/checkout/payment",
  },
];

type AppliedVoucherState = {
  id: string;
  code: string;
};

export const CartPage = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>({
    subtotal: 0,
    shippingFee: 0,
    discount: 0,
    totalPrice: 0,
  });
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucherState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadCart = useCallback(
    async (withLoader: boolean = false) => {
      if (withLoader) {
        setIsLoading(true);
      }

      try {
        const [fetchedItems, fetchedTotals] = await Promise.all([
          cartService.getItems(),
          cartService.getTotals(appliedVoucher?.id),
        ]);

        setItems(fetchedItems);
        setTotals(fetchedTotals);
        return true;
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Không thể tải giỏ hàng. Vui lòng thử lại.",
          "error",
        );
        return false;
      } finally {
        if (withLoader) {
          setIsLoading(false);
        }
      }
    },
    [appliedVoucher?.id, showToast],
  );

  useEffect(() => {
    void loadCart(true);
  }, [loadCart]);

  const handleQuantityChange = async (
    cartItemId: string | undefined,
    delta: number,
  ) => {
    if (!cartItemId) {
      return;
    }

    const currentItem = items.find((item) => item.cartItemId === cartItemId);
    if (!currentItem) {
      return;
    }

    const currentQuantity = currentItem.quantity ?? 1;
    const nextQuantity = Math.max(1, currentQuantity + delta);
    if (nextQuantity === currentQuantity) {
      return;
    }

    setUpdatingItemId(cartItemId);
    try {
      await cartService.updateCartItem(cartItemId, nextQuantity);
      await loadCart();
      showToast("Đã cập nhật số lượng", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật số lượng",
        "error",
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (cartItemId: string | undefined) => {
    if (!cartItemId) {
      return;
    }

    setUpdatingItemId(cartItemId);
    try {
      await cartService.removeCartItem(cartItemId);
      await loadCart();
      showToast("Đã xóa sản phẩm khỏi giỏ hàng", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể xóa sản phẩm. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClearCart = async () => {
    if (items.length === 0) {
      return;
    }

    setIsClearing(true);
    try {
      await cartService.clearCart();
      setAppliedVoucher(null);
      setVoucherInput("");
      await loadCart();
      showToast("Đã xóa toàn bộ giỏ hàng", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể xóa giỏ hàng. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setIsClearing(false);
    }
  };

  const applyVoucher = async (code: string) => {
    const normalizedVoucher = code.trim();

    if (!normalizedVoucher) {
      setIsApplyingVoucher(true);
      try {
        const updatedTotals = await cartService.getTotals();
        setTotals(updatedTotals);
        setAppliedVoucher(null);
        showToast("Đã bỏ mã giảm giá", "info");
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Không thể bỏ mã giảm giá",
          "error",
        );
      } finally {
        setIsApplyingVoucher(false);
      }
      return;
    }

    if (
      appliedVoucher &&
      appliedVoucher.code.toLowerCase() === normalizedVoucher.toLowerCase()
    ) {
      showToast("Mã giảm giá đã được áp dụng", "info");
      return;
    }

    setIsApplyingVoucher(true);
    try {
      const voucher = await voucherService.findVoucherByCode(normalizedVoucher);
      if (!voucher?.id) {
        throw new Error("Mã giảm giá không tồn tại hoặc đã hết hạn.");
      }

      const updatedTotals = await cartService.getTotals(voucher.id);

      setTotals(updatedTotals);
      setAppliedVoucher({
        id: voucher.id,
        code: voucher.code ?? normalizedVoucher,
      });
      setVoucherInput(voucher.code ?? normalizedVoucher);
      showToast("Đã áp dụng mã giảm giá", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể áp dụng mã giảm giá",
        "error",
      );
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const renderSkeletonItems = () =>
    Array.from({ length: 2 }).map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="h-40 rounded-[32px] border border-gray-100 bg-white/70 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.06)] animate-pulse"
      >
        <div className="h-full w-full rounded-2xl bg-gray-100" />
      </div>
    ));

  return (
    <MainLayout>
      <section className="bg-gradient-to-b from-[#fdf8f5] to-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
            Bag
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1
                className="text-4xl text-slate-900"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                Giỏ hàng
              </h1>
              <p className="text-sm text-gray-500">
                ({items.length} sản phẩm) được giữ trong 30 phút tiếp theo
              </p>
            </div>
            <Link
              to="/"
              className="text-sm font-semibold text-red-600 transition hover:text-red-500"
            >
              Tiếp tục mua hàng →
            </Link>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-8">
              {isLoading ? (
                <div className="space-y-6">{renderSkeletonItems()}</div>
              ) : items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center text-gray-500">
                  Giỏ hàng đang trống. Khám phá các bộ sưu tập mới nhất của chúng tôi.
                </div>
              ) : (
                items.map((item, index) => {
                  const itemKey = item.cartItemId ?? `${item.variantId}-${index}`;
                  const quantity = Math.max(1, item.quantity ?? 1);
                  const lineTotal = item.subTotal
                    ? Number(item.subTotal)
                    : Number(item.variantPrice ?? 0) * quantity;

                  return (
                    <article
                      key={itemKey}
                      className="rounded-[32px] border border-gray-100 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)]"
                    >
                    <div className="flex flex-col gap-6 md:flex-row">
                      <div className="h-40 w-full overflow-hidden rounded-3xl bg-gray-100 md:h-36 md:w-36">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.variantName ?? "Sản phẩm"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-4">
                        <div className="flex flex-col gap-2">
                          <h2 className="text-lg font-semibold text-slate-900">
                            {item.variantName ?? "Sản phẩm chưa đặt tên"}
                          </h2>
                          {(item.volumeMl || item.variantPrice) && (
                            <p className="text-sm text-gray-500">
                              {item.volumeMl ? `${item.volumeMl} ml` : ""}
                              {item.volumeMl && item.variantPrice ? " • " : ""}
                              {item.variantPrice
                                ? `Đơn giá ${formatCurrency(item.variantPrice)}`
                                : ""}
                            </p>
                          )}
                          {item.variantId && (
                            <p className="text-xs text-gray-400 break-all">
                              Variant ID: {item.variantId}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 text-sm">
                          <div className="flex items-center gap-3 rounded-full border border-gray-200 px-3 py-1.5">
                            <button
                              type="button"
                              className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100 disabled:text-gray-300"
                              onClick={() => handleQuantityChange(item.cartItemId, -1)}
                              disabled={quantity <= 1 || updatingItemId === item.cartItemId}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="min-w-[2ch] text-center font-semibold">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              className="rounded-full p-1 text-gray-500 transition hover:bg-gray-100"
                              onClick={() => handleQuantityChange(item.cartItemId, 1)}
                              disabled={updatingItemId === item.cartItemId}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <p className="text-lg font-semibold text-red-600">
                            {formatCurrency(lineTotal)}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.cartItemId)}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-red-600"
                            disabled={updatingItemId === item.cartItemId}
                          >
                            <Trash2 size={16} />
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="space-y-8">
              <aside className="rounded-[32px] border border-gray-100 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-500">Tạm tính</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(totals.subtotal)}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-emerald-600">
                    {totals.shippingFee === 0
                      ? "Free"
                      : formatCurrency(totals.shippingFee)}
                  </span>
                </div>
                {totals.discount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm text-emerald-600">
                    <span>Giảm giá</span>
                    <span>-{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between text-base font-semibold text-slate-900">
                  <span>Tổng</span>
                  <span>{formatCurrency(totals.totalPrice)}</span>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                    Mã giảm giá
                  </label>
                  <div className="flex gap-3">
                    <input
                      className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      placeholder="Nhập mã"
                      value={voucherInput}
                      onChange={(event) => setVoucherInput(event.target.value)}
                    />
                    <button
                      type="button"
                      className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60"
                      onClick={() => void applyVoucher(voucherInput)}
                      disabled={isApplyingVoucher}
                    >
                      {isApplyingVoucher ? "Đang áp dụng" : "Áp dụng"}
                    </button>
                  </div>
                  {appliedVoucher && (
                    <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-2 text-xs text-rose-700">
                      <span>Mã đang áp dụng: {appliedVoucher.code}</span>
                      <button
                        type="button"
                        className="font-semibold"
                        onClick={() => {
                          setVoucherInput("");
                          void applyVoucher("");
                        }}
                        disabled={isApplyingVoucher}
                      >
                        Bỏ mã
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={isClearing || items.length === 0}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-60"
                >
                  {isClearing ? "Đang xóa giỏ hàng..." : "Xóa giỏ hàng"}
                </button>

                <Link
                  to="/checkout/shipping"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-red-600 px-6 py-4 text-center text-base font-semibold tracking-wide text-white transition hover:bg-red-500"
                >
                  Thanh toán
                </Link>
              </aside>

              <div className="rounded-[32px] border border-dashed border-gray-200 bg-white/70 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                  Checkout preview
                </p>
                <div className="mt-4 space-y-4">
                  {checkoutPreviewLinks.map((link) => (
                    <Link
                      key={link.id}
                      to={link.href}
                      className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:border-red-200 hover:text-red-600"
                    >
                      <div>
                        <p style={{ fontFamily: '"General Sans", sans-serif' }}>
                          {link.id}. {link.title}
                        </p>
                        <p className="text-xs font-normal text-gray-500">
                          {link.description}
                        </p>
                      </div>
                      <span className="text-lg">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-6 rounded-[32px] border border-dashed border-gray-200 bg-white/70 p-8 md:grid-cols-3">
            {checkoutSteps.map((step) => (
              <div key={step.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                  Step {step.id}
                </p>
                <p
                  className="text-lg font-semibold text-slate-900"
                  style={{ fontFamily: '"General Sans", sans-serif' }}
                >
                  {step.label}
                </p>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
