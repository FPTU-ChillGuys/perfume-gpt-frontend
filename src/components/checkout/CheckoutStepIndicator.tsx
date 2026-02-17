import type { CheckoutStep } from "@/data/checkoutSample";

interface CheckoutStepIndicatorProps {
  steps: CheckoutStep[];
  activeStep: number;
}

export const CheckoutStepIndicator = ({
  steps,
  activeStep,
}: CheckoutStepIndicatorProps) => {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          const isCompleted = step.id < activeStep;
          const showDivider = index < steps.length - 1;

          return (
            <div
              key={step.id}
              className="flex flex-1 items-start gap-4"
            >
              <div
                className={[
                  "relative flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-semibold",
                  isActive
                    ? "border-red-600 bg-red-600 text-white"
                    : isCompleted
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-gray-200 text-gray-500",
                ].join(" ")}
                style={{ fontFamily: '"General Sans", sans-serif' }}
              >
                {step.id}
                {showDivider && (
                  <span className="absolute left-full top-1/2 hidden h-px w-20 -translate-y-1/2 bg-gray-200 md:block" />
                )}
              </div>

              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                  Step {step.id}
                </p>
                <p
                  className="text-lg font-semibold text-slate-900"
                  style={{ fontFamily: '"General Sans", sans-serif' }}
                >
                  {step.label}
                </p>
                <p className="text-sm text-slate-500">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
