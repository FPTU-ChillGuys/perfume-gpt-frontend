export const HeroSection = () => {
  return (
    <section className="relative h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 overflow-hidden">
      {/* Background Image (placeholder) */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Content */}
      <div className="container mx-auto px-4 h-full relative z-10">
        <div className="grid md:grid-cols-2 gap-8 h-full items-center">
          {/* Left Content */}
          <div className="text-white">
            <p className="text-sm tracking-wider mb-4 text-gray-300">
              EXCLUSIVE RELEASE
            </p>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              ELIXIR
              <br />
              ABSOLU
            </h1>
            <p className="text-gray-300 mb-8 max-w-md leading-relaxed">
              Khơi gợi những nốt hương quyến rũ, sang trọng với hương thơm từ
              hoa hồng, vani và xạ hương, tôn lên sự đẳng cấp trong từng giây
              phút.
            </p>
            <div className="flex gap-4">
              <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Mua Ngay
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition">
                Chi tiết
              </button>
            </div>
          </div>

          {/* Right Image Placeholder */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-64 h-80 bg-gradient-to-br from-pink-600/30 to-purple-600/30 rounded-lg backdrop-blur-sm flex items-center justify-center">
              <div className="text-white/50 text-center">
                <div className="w-32 h-48 mx-auto bg-white/10 rounded-lg mb-4"></div>
                <p className="text-sm">Product Image</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
