import { ChevronRight } from "lucide-react";

const bannerCollections = [
  {
    brand: "Chanel",
    collection: "LES EXCLUSIFS",
    highlight: "Sycomore Parfum",
    description:
      "Tầng hương gỗ ấm áp kết hợp cỏ hương bài và hoắc hương, tái hiện rõ nét tinh thần Paris sang trọng.",
    notes: ["Vetiver", "Sandalwood", "Amber"],
    imageUrl:
        "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=1200&q=80",
  },
  {
    brand: "Dior",
    collection: "LA COLLECTION PRIVÉE",
    highlight: "Gris Dior 2026",
    description:
      "Phiên bản giới hạn phô diễn hoa hồng Grasse và xạ hương trắng cho dấu ấn hiện đại đầy cảm xúc.",
    notes: ["Rose", "Musk", "Patchouli"],
    imageUrl:
            "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1200&q=80",
  },
  {
    brand: "Gucci",
    collection: "THE ALCHEMIST'S GARDEN",
    highlight: "A Gloaming Night",
    description:
      "Mùi hương phương Đông hòa quyện gỗ đàn hương và nghệ tây, dành cho khoảnh khắc tiệc đêm huyền bí.",
    notes: ["Saffron", "Cedar", "Tonka"],
    imageUrl:
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=80",
  },
];

export const CollectionBannerSection = () => {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-16 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-rose-500/20 via-transparent to-transparent" />
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col gap-3 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Curated Perfume Banners
          </p>
          <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
            Bản phối thương hiệu nước hoa năm 2026
          </h2>
          <p className="text-base text-white/70 md:text-lg">
            Khám phá những banner cảm hứng mới nhất, giúp bạn dễ dàng chọn đúng thương hiệu và bộ sưu tập yêu thích.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {bannerCollections.map((banner) => (
            <article
              key={banner.brand}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5"
            >
              <div className="absolute inset-0">
                <img
                  src={banner.imageUrl}
                  alt={`${banner.brand} perfume presentation`}
                  className="h-full w-full object-cover opacity-60"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/20 to-transparent" />
              </div>

              <div className="relative z-10 flex h-full flex-col justify-between gap-6 p-8">
                <div className="space-y-4">
                  <span className="inline-flex items-center rounded-full border border-white/30 px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
                    {banner.collection}
                  </span>
                  <div>
                    <h3 className="text-3xl font-semibold uppercase">
                      {banner.brand}
                    </h3>
                    <p className="text-sm text-white/70">{banner.highlight}</p>
                  </div>
                  <p className="text-base text-white/80">
                    {banner.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
                    {banner.notes.map((note, index) => (
                      <span
                        key={`${banner.brand}-${note}-${index}`}
                        className="rounded-full border border-white/20 px-3 py-1"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                  <button className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-white transition hover:text-rose-200">
                    Khám phá
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
