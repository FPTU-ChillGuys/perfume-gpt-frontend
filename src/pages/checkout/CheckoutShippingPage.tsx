import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { CheckoutStepIndicator } from "@/components/checkout/CheckoutStepIndicator";
import { OrderSummaryCard } from "@/components/checkout/OrderSummaryCard";
import {
  checkoutSteps,
  sampleOrderItems,
  sampleOrderTotals,
} from "@/data/checkoutSample";

const shippingChoices = [
  {
    id: "home",
    title: "Home Delivery",
    timeline: "1-3 business days",
    description:
      "Shipping available nationwide with temperature-controlled logistics.",
    detail: "Complimentary for orders from 3.000.000đ",
  },
  {
    id: "store",
    title: "Collect In-Store",
    timeline: "Ready in 24 hours",
    description: "Pick up at PerfumeGPT Boutique - Nguyen Hue, District 1.",
    detail: "We will notify you when your order is prepared.",
  },
];

const baseInputClass =
  "h-12 rounded-2xl border border-gray-200 px-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100";

export const CheckoutShippingPage = () => {
  const [selectedOption, setSelectedOption] = useState("home");

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
                Delivery Method
              </h1>
              <p className="text-sm text-gray-500">
                Choose how you would like to receive your fragrances.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Cần hỗ trợ?{" "}
              <span className="font-semibold text-slate-900">1900-0000</span>
            </div>
          </div>

          <div className="mt-8">
            <CheckoutStepIndicator steps={checkoutSteps} activeStep={1} />
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-10">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                  Fulfillment options
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {shippingChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => setSelectedOption(choice.id)}
                      className={[
                        "rounded-[28px] border p-5 text-left transition",
                        selectedOption === choice.id
                          ? "border-red-500 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                          : "border-gray-200 bg-white/70 hover:border-gray-300",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {choice.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {choice.timeline}
                          </p>
                        </div>
                        <span
                          className={[
                            "h-5 w-5 rounded-full border-2",
                            selectedOption === choice.id
                              ? "border-red-500 bg-red-500"
                              : "border-gray-200",
                          ].join(" ")}
                        />
                      </div>
                      <p className="mt-4 text-sm text-gray-600">
                        {choice.description}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        {choice.detail}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-4xl border border-gray-100 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                      Shipping details
                    </p>
                    <p
                      className="text-lg font-semibold text-slate-900"
                      style={{ fontFamily: '"General Sans", sans-serif' }}
                    >
                      Customer Information
                    </p>
                  </div>
                  <Link
                    to="/cart"
                    className="text-sm font-semibold text-red-600"
                  >
                    Quay lại giỏ hàng
                  </Link>
                </div>

                <form className="mt-6 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      className={`${baseInputClass} w-full`}
                      placeholder="First name*"
                    />
                    <input
                      className={`${baseInputClass} w-full`}
                      placeholder="Last name*"
                    />
                  </div>
                  <input
                    className={`${baseInputClass} w-full`}
                    placeholder="Street address"
                  />
                  <input
                    className={`${baseInputClass} w-full`}
                    placeholder="Apartment, building, floor (optional)"
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <input
                      className={`${baseInputClass} w-full`}
                      placeholder="City"
                    />
                    <select
                      className={`${baseInputClass} w-full`}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        State
                      </option>
                      <option value="hcm">Ho Chi Minh City</option>
                      <option value="hn">Ha Noi</option>
                    </select>
                    <input
                      className={`${baseInputClass} w-full`}
                      placeholder="Zip code"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex gap-3">
                      <select
                        className={`${baseInputClass} w-28`}
                        defaultValue="+84"
                      >
                        <option value="+84">+84</option>
                        <option value="+65">+65</option>
                        <option value="+1">+1</option>
                      </select>
                      <input
                        className={`${baseInputClass} flex-1`}
                        placeholder="Phone number"
                      />
                    </div>
                    <input
                      className={`${baseInputClass} w-full`}
                      placeholder="Email address"
                    />
                  </div>
                </form>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-gray-500">
                    Shipping updates will be sent via SMS & email.
                  </p>
                  <Link
                    to="/checkout/packaging"
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white"
                  >
                    Continue to packaging
                  </Link>
                </div>
              </div>
            </div>

            <OrderSummaryCard
              items={sampleOrderItems}
              totals={sampleOrderTotals}
            >
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-xs text-gray-600">
                <p className="font-semibold text-slate-900">
                  Delivery preference
                </p>
                <p>
                  {
                    shippingChoices.find(
                      (choice) => choice.id === selectedOption,
                    )?.title
                  }
                </p>
              </div>
            </OrderSummaryCard>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
