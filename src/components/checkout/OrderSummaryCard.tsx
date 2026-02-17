import type { ReactNode } from "react";
import type {
  OrderSummaryItem,
  OrderTotals,
} from "@/data/checkoutSample";

interface OrderSummaryCardProps {
  items: OrderSummaryItem[];
  totals: OrderTotals;
  showPoints?: boolean;
  children?: ReactNode;
  footerSlot?: ReactNode;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + "đ";

export const OrderSummaryCard = ({
  items,
  totals,
  showPoints = true,
  children,
  footerSlot,
}: OrderSummaryCardProps) => {
  return (
    <aside className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
            Order Summary
          </p>
          <h3
            className="text-2xl font-semibold text-slate-900"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Perfume Selection
          </h3>
        </div>
        {showPoints && totals.loyaltyPoints && (
          <div className="rounded-2xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
            Earn {totals.loyaltyPoints.toLocaleString("vi-VN")} pts
          </div>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {items.map((item) => {
          const subtitle = [item.variant, item.volume]
            .filter((text): text is string => Boolean(text))
            .join(" • ");

          return (
            <div key={item.id} className="flex gap-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-1 justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  {item.brand}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {item.name}
                </p>
                  {subtitle && (
                    <p className="text-xs text-gray-500">{subtitle}</p>
                  )}
                <p className="text-xs text-gray-500">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(item.price)}
              </p>
            </div>
          </div>
          );
        })}
      </div>

      {children && <div className="mt-6">{children}</div>}

      <div className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>{totals.shipping === 0 ? "Free" : formatCurrency(totals.shipping)}</span>
        </div>
        {typeof totals.packaging === "number" && (
          <div className="flex justify-between text-gray-600">
            <span>Packaging</span>
            <span>
              {totals.packaging === 0
                ? "Included"
                : formatCurrency(totals.packaging)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>Tax (VAT 8%)</span>
          <span>{formatCurrency(totals.tax)}</span>
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex items-center justify-between text-base font-semibold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-600">
        <p className="font-medium text-slate-900">PerfumeGPT Guarantee</p>
        <p>Our consultants authenticate every bottle for 100% purity and longevity.</p>
      </div>

      {footerSlot && <div className="mt-6">{footerSlot}</div>}
    </aside>
  );
};
