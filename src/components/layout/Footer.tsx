import { MapPin, Phone, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-100 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* PerfumeGPT */}
          <div>
            <h3 className="text-lg font-bold mb-4">PerfumeGPT</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Thương hiệu nước hoa uy tín hàng đầu Việt Nam. Mang đến cho bạn
              những sản phẩm chính hãng với mức giá hấp dẫn cùng trải nghiệm mua
              sắm tuyệt vời.
            </p>
          </div>

          {/* Hỗ trợ khách hàng */}
          <div>
            <h3 className="text-lg font-bold mb-4">Hỗ trợ khách hàng</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Hướng dẫn mua hàng
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Chính sách đổi trả
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Chính sách vận chuyển
                </a>
              </li>
            </ul>
          </div>

          {/* Về chúng tôi */}
          <div>
            <h3 className="text-lg font-bold mb-4">Về chúng tôi</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Giới thiệu
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Hệ thống cửa hàng
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Tin tức & Sự kiện
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Liên hệ
                </a>
              </li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h3 className="text-lg font-bold mb-4">Liên hệ</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin
                  size={18}
                  className="flex-shrink-0 mt-0.5 text-red-600"
                />
                <span>
                  7 D, Long Thạnh Mỹ, Thủ Đức, Thành phố Hồ Chí Minh 700000
                </span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={18} className="text-red-600" />
                <span>1900-0000</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={18} className="text-red-600" />
                <span>contact@perfumegpt.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-300">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-gray-600 text-sm">
            © 2026 PerfumeGPT. Made by <strong>ChillGuys</strong>.
          </p>
        </div>
      </div>
    </footer>
  );
};
