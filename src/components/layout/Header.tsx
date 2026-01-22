import { Search, Heart, ShoppingCart, User } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
      {/* Top Bar */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-red-600">PerfumeGPT</h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-6">
            <button className="text-gray-900 hover:text-red-600">
              <Heart size={24} fill="currentColor" />
            </button>
            <button className="text-gray-900 hover:text-red-600">
              <ShoppingCart size={24} fill="currentColor" />
            </button>
            <button className="flex items-center gap-2 text-gray-900 hover:text-red-600">
              <User size={24} fill="currentColor" />
              <span className="text-sm font-medium">Đăng nhập</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav>
        <div className="container mx-auto px-4">
          <ul className="flex items-center justify-center gap-8 py-4">
            <li>
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Nước Hoa Nam
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Nước Hoa Nữ
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                GiftSet
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-700 hover:text-red-600 font-medium"
              >
                Thương Hiệu
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};
