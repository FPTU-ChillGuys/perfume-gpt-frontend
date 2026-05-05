import { MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import tiktokIcon from "../../assets/tiktok.png";
import facebookIcon from "../../assets/facebook.png";
import instagramIcon from "../../assets/instagram.png";
import zaloIcon from "../../assets/zalo.png";
import cashIcon from "../../assets/cash.png";
import vnpayIcon from "../../assets/vnpay.jpg";
import momoIcon from "../../assets/momo.png";
import payosIcon from "../../assets/payos.png";
import phuocPix from "../../assets/PhuocPix.png";
import thanhPix from "../../assets/ThanhPix.png";
import khoaPix from "../../assets/KhoaPix.png";
import quanPix from "../../assets/QuanPix.png";
import nguyenPix from "../../assets/NguyenPix.png";

export const Footer = () => {
  return (
    <footer className="bg-gray-100 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* PerfumeGPT */}
          <div>
            <h3 className="text-lg font-bold mb-4">PerfumeGPT</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Thương hiệu nước hoa uy tín ở Việt Nam. Mang đến cho bạn
              những sản phẩm chính hãng với mức giá hợp lý cùng trải nghiệm mua
              sắm tuyệt vời.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Hỗ trợ khách hàng</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/pages/huong-dan-mua-hang"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Hướng dẫn mua hàng
                </Link>
              </li>
              <li>
                <Link
                  to="/pages/huong-dan-su-dung-bao-quan"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Hướng dẫn sử dụng &amp; bảo quản
                </Link>
              </li>
              <li>
                <Link
                  to="/pages/chinh-sach-mua-hang"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Chính sách mua hàng
                </Link>
              </li>
            </ul>
          </div>

          {/* Về chúng tôi */}
          <div>
            <h3 className="text-lg font-bold mb-4">Về chúng tôi</h3>
            <ul className="space-y-2 mb-4">
              <li>
                <Link
                  to="/pages/gioi-thieu-ve-perfumegpt"
                  className="text-gray-600 hover:text-red-600 text-sm"
                >
                  Giới thiệu
                </Link>
              </li>
            </ul>

            {/* Theo dõi chúng tôi */}
            <p className="text-sm font-semibold text-gray-700 mb-2">Theo dõi chúng tôi</p>
            <div className="flex items-center gap-3 mb-5">
              <a href="https://www.tiktok.com/@fptuniversity" target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                className="w-8 h-8 rounded-full overflow-hidden hover:opacity-75 transition-opacity flex-shrink-0">
                <img src={tiktokIcon} alt="TikTok" className="w-full h-full object-cover" />
              </a>
              <a href="https://www.facebook.com/FPTU.HCM" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="w-8 h-8 rounded-full overflow-hidden hover:opacity-75 transition-opacity flex-shrink-0">
                <img src={facebookIcon} alt="Facebook" className="w-full h-full object-cover" />
              </a>
              <a href="https://www.instagram.com/fptuniversityhcm/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-8 h-8 rounded-full overflow-hidden hover:opacity-75 transition-opacity flex-shrink-0">
                <img src={instagramIcon} alt="Instagram" className="w-full h-full object-cover" />
              </a>
              <a href="https://miniapp.zaloplatforms.com/apps/4234808768914057878/" target="_blank" rel="noopener noreferrer" aria-label="Zalo"
                className="w-8 h-8 rounded-full overflow-hidden hover:opacity-75 transition-opacity flex-shrink-0">
                <img src={zaloIcon} alt="Zalo" className="w-full h-full object-cover" />
              </a>
            </div>

            {/* Thanh toán */}
            <p className="text-sm font-semibold text-gray-700 mb-2">Thanh toán</p>
            <div className="flex items-center gap-2 flex-wrap">
              <img src={cashIcon} alt="Cash" title="Tiền mặt"
                className="h-8 w-8 object-contain rounded border border-gray-200 bg-white" />
              <img src={vnpayIcon} alt="VNPay" title="VNPay"
                className="h-8 w-8 object-contain rounded border border-gray-200 bg-white" />
              <img src={momoIcon} alt="MoMo" title="MoMo"
                className="h-8 w-8 object-contain rounded border border-gray-200 bg-white" />
              <img src={payosIcon} alt="PayOS" title="PayOS"
                className="h-8 w-8 object-contain rounded border border-gray-200 bg-white" />
            </div>
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <div className="group relative w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden hover:scale-110 transition-transform duration-300">
                <img src={quanPix} alt="Quan" className="w-10 h-10 object-contain [image-rendering:pixelated]" title="Quan" />
              </div>
              <div className="group relative w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden hover:scale-110 transition-transform duration-300">
                <img src={phuocPix} alt="Phuoc" className="w-10 h-10 object-contain [image-rendering:pixelated]" title="Phuoc" />
              </div>
              <div className="group relative w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden hover:scale-110 transition-transform duration-300">
                <img src={khoaPix} alt="Khoa" className="w-10 h-10 object-contain [image-rendering:pixelated]" title="Khoa" />
              </div>
              <div className="group relative w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden hover:scale-110 transition-transform duration-300">
                <img src={thanhPix} alt="Thanh" className="w-10 h-10 object-contain [image-rendering:pixelated]" title="Thanh" />
              </div>
              <div className="group relative w-12 h-12 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden hover:scale-110 transition-transform duration-300">
                <img src={nguyenPix} alt="Nguyen" className="w-10 h-10 object-contain [image-rendering:pixelated]" title="Nguyen" />
              </div>
            </div>
            <p className="text-center text-gray-600 text-sm">
              © 2026 PerfumeGPT. Made by <strong>ChillGuys</strong>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
