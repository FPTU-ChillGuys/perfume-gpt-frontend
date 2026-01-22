import { BadgeCheck, Gift, Shield, ArrowRight } from "lucide-react";

const features = [
  {
    icon: BadgeCheck,
    title: "100% Chính hãng",
  },
  {
    icon: Gift,
    title: "Ưu đãi độc quyền",
  },
  {
    icon: Shield,
    title: "Giao dịch an toàn",
  },
];

export const FeatureSection = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* About PerfumeGPT */}
        <h2 className="text-2xl font-bold text-center mb-12">Về PerfumeGPT</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center">
                <feature.icon size={70} className="text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-800">{feature.title}</h3>
            </div>
          ))}
        </div>

        {/* Signup Section */}
        <div className="max-w-2xl mx-auto text-center mt-12">
          <h2 className="text-3xl font-bold mb-4">
            Hãy là người đầu tiên được biết
          </h2>
          <p className="text-gray-600 mb-8">
            Nhận ngay thông tin về các sản phẩm mới nhất và các ưu đãi đặc biệt
            chỉ dành cho những khách hàng đặc biệt của PerfumeGPT
          </p>
          <button className="inline-flex items-center gap-2 bg-white text-gray-900 border-2 border-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-900 hover:text-white transition">
            ĐĂNG KÝ NGAY
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
};
