import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Landmark, Wallet } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { CheckoutStepIndicator } from "@/components/checkout/CheckoutStepIndicator";
import { OrderSummaryCard } from "@/components/checkout/OrderSummaryCard";
import {
  checkoutSteps,
  sampleOrderItems,
  sampleOrderTotals,
} from "@/data/checkoutSample";

const paymentMethods = [
  {
    id: "card",
    title: "Credit Card",
    description: "VISA, MasterCard, AMEX",
    icon: CreditCard,
  },
  {
    id: "bank",
    title: "Bank Transfer",
    description: "Manual confirmation within 24h",
    icon: Landmark,
  },
  {
    id: "cod",
    title: "Cash on Delivery",
    description: "Pay at door",
    icon: Wallet,
  },
];

const baseInputClass =
  "h-12 rounded-2xl border border-gray-200 px-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100";

export const CheckoutPaymentPage = () => {
  const [selectedMethod, setSelectedMethod] = useState("card");

  return (
    <MainLayout>
      <section className="bg-linear-to-b from-[#fdf8f5] to-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                Checkout
              </p>
              <h1
                className="text-4xl text-slate-900"
                style={{ fontFamily: '"Playfair Display", serif' }}
              >
                Payment
              </h1>
              <p className="text-sm text-gray-500">
                Finalize your purchase to start your fragrance journey.
              </p>
            </div>
            <Link
              to="/checkout/packaging"
              className="text-sm font-semibold text-red-600"
            >
              Quay lại đóng gói
            </Link>
          </div>

          <div className="mt-8">
            <CheckoutStepIndicator steps={checkoutSteps} activeStep={3} />
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-8">
              <section className="rounded-4xl border border-gray-100 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                      Payment methods
                    </p>
                    <p
                      className="text-lg font-semibold text-slate-900"
                      style={{ fontFamily: '"General Sans", sans-serif' }}
                    >
                      Secure checkout
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    128-bit encrypted checkout
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isActive = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method.id)}
                        className={[
                          "flex w-full items-center justify-between rounded-3xl border px-5 py-4 text-left transition",
                          isActive
                            ? "border-red-500 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                            : "border-gray-200 bg-white/70 hover:border-gray-300",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-4">
                          <span className="rounded-2xl bg-gray-100 p-3">
                            <Icon className="text-slate-700" />
                          </span>
                          <div>
                            <p className="text-base font-semibold text-slate-900">
                              {method.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <span
                          className={[
                            "h-4 w-4 rounded-full border-2",
                            isActive
                              ? "border-red-500 bg-red-500"
                              : "border-gray-200",
                          ].join(" ")}
                        />
                      </button>
                    );
                  })}
                </div>

                {selectedMethod === "card" && (
                  <form className="mt-6 space-y-4">
                    <input
                      className={`${baseInputClass} w-full`}
                      placeholder="Card number"
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        className={`${baseInputClass} w-full`}
                        placeholder="MM / YY"
                      />
                      <input
                        className={`${baseInputClass} w-full`}
                        placeholder="CVV"
                      />
                    </div>
                    <input
                      className={`${baseInputClass} w-full`}
                      placeholder="Name on card"
                    />
                  </form>
                )}

                {selectedMethod === "bank" && (
                  <div className="mt-6 rounded-3xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                    Transfer via Vietcombank - PerfumeGPT Co., LTD / 0123456789
                  </div>
                )}

                {selectedMethod === "cod" && (
                  <div className="mt-6 rounded-3xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                    Bạn sẽ thanh toán cho nhân viên giao hàng khi nhận được sản
                    phẩm.
                  </div>
                )}

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <Link
                    to="/checkout/packaging"
                    className="text-sm font-semibold text-gray-500"
                  >
                    ← Quay lại
                  </Link>
                  <Link
                    to="/"
                    className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white"
                  >
                    Place order
                  </Link>
                </div>
              </section>

              <section className="rounded-4xl border border-gray-100 bg-white/90 p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                      Contact
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      Need help?
                    </p>
                    <p className="text-sm text-gray-500">
                      1900-0000 • contact@perfumegpt.com
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    Weekdays 9am - 9pm
                    <br />
                    Weekends 10am - 6pm
                  </div>
                </div>
              </section>
            </div>

            <OrderSummaryCard
              items={sampleOrderItems}
              totals={sampleOrderTotals}
            >
              <div className="space-y-3 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <Link
                    to="/checkout/shipping"
                    className="font-semibold text-red-600"
                  >
                    Edit
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span>Packaging</span>
                  <Link
                    to="/checkout/packaging"
                    className="font-semibold text-red-600"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </OrderSummaryCard>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
