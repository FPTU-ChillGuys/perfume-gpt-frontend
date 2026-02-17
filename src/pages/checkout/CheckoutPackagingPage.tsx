import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Ribbon, Package } from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { CheckoutStepIndicator } from "@/components/checkout/CheckoutStepIndicator";
import { OrderSummaryCard } from "@/components/checkout/OrderSummaryCard";
import {
  checkoutSteps,
  sampleOrderItems,
  sampleOrderTotals,
} from "@/data/checkoutSample";

const packagingChoices = [
  {
    id: "signature-box",
    title: "Signature Box",
    price: 0,
    description: "Our minimalist, sustainable fragrance box designed for safekeeping.",
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "signature-bag",
    title: "Signature Bag",
    price: 150000,
    description: "Elevate your gift with our premium boutique shopping bag and silk ribbon.",
    imageUrl:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80",
  },
];

const addOns = [
  {
    id: "note",
    title: "Complimentary card",
    description: "Add a handwritten note on textured cotton paper",
  },
  {
    id: "seal",
    title: "Wax seal",
    description: "Gold foil seal with PerfumeGPT monogram",
  },
];

export const CheckoutPackagingPage = () => {
  const [selectedPackaging, setSelectedPackaging] = useState("signature-box");
  const [message, setMessage] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const totals = useMemo(() => {
    const packagingPrice = packagingChoices.find(
      (choice) => choice.id === selectedPackaging,
    )?.price ?? 0;

    return {
      ...sampleOrderTotals,
      packaging: packagingPrice,
      total: sampleOrderTotals.total + packagingPrice,
    };
  }, [selectedPackaging]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <MainLayout>
      <section className="bg-gradient-to-b from-[#fdf8f5] to-white py-16">
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
                Packaging Options & Gifting
              </h1>
              <p className="text-sm text-gray-500">
                Personalize your fragrance experience and choose your gifting options.
              </p>
            </div>
            <Link
              to="/checkout/shipping"
              className="text-sm font-semibold text-red-600"
            >
              Quay lại giao hàng
            </Link>
          </div>

          <div className="mt-8">
            <CheckoutStepIndicator steps={checkoutSteps} activeStep={2} />
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="space-y-10">
              <section className="rounded-[32px] border border-gray-100 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="flex items-center gap-3">
                  <Package className="text-red-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                      Choose packaging
                    </p>
                    <p className="text-lg font-semibold text-slate-900" style={{ fontFamily: '"General Sans", sans-serif' }}>
                      Signature presentation
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {packagingChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => setSelectedPackaging(choice.id)}
                      className={[
                        "flex flex-col gap-4 rounded-[28px] border p-4 text-left transition",
                        selectedPackaging === choice.id
                          ? "border-red-500 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.08)]"
                          : "border-gray-200 bg-white/70 hover:border-gray-300",
                      ].join(" ")}
                    >
                      <div className="h-40 overflow-hidden rounded-2xl bg-gray-100">
                        <img
                          src={choice.imageUrl}
                          alt={choice.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {choice.title}
                          </p>
                          <p className="text-sm text-gray-500">{choice.description}</p>
                        </div>
                        <div className="text-right text-sm font-semibold text-slate-900">
                          {choice.price === 0
                            ? "Free"
                            : new Intl.NumberFormat("vi-VN").format(choice.price) + "đ"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-gray-100 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="flex items-center gap-3">
                  <Ribbon className="text-red-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                      Boutique services
                    </p>
                    <p className="text-lg font-semibold text-slate-900" style={{ fontFamily: '"General Sans", sans-serif' }}>
                      Add-on details
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {addOns.map((addOn) => (
                    <label
                      key={addOn.id}
                      className="flex cursor-pointer items-start gap-4 rounded-2xl border border-gray-100 p-4 text-sm transition hover:border-gray-200"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                        checked={selectedAddOns.includes(addOn.id)}
                        onChange={() => toggleAddOn(addOn.id)}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{addOn.title}</p>
                        <p className="text-gray-500">{addOn.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
                    Add a gift message (optional)
                  </p>
                  <textarea
                    className="mt-3 h-28 w-full resize-none rounded-3xl border border-gray-200 p-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    placeholder="Write a personal note..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <Link
                    to="/checkout/shipping"
                    className="text-sm font-semibold text-gray-500"
                  >
                    ← Cập nhật địa chỉ
                  </Link>
                  <Link
                    to="/checkout/payment"
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white"
                  >
                    Continue to payment
                  </Link>
                </div>
              </section>
            </div>

            <OrderSummaryCard items={sampleOrderItems} totals={totals}>
              <div className="text-xs text-gray-600">
                <p className="font-semibold text-slate-900">Selected packaging</p>
                <p>
                  {
                    packagingChoices.find((choice) => choice.id === selectedPackaging)
                      ?.title
                  }
                </p>
                {message && (
                  <p className="mt-2 rounded-2xl bg-rose-50 p-3 text-rose-700">
                    "{message}"
                  </p>
                )}
              </div>
            </OrderSummaryCard>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
