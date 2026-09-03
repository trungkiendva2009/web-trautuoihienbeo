# TRÂU TƯƠI HIỀN BÉO - Restaurant Website & Admin System

Hệ thống quản lý nhà hàng hoàn chỉnh với trang web khách hàng và trang quản trị.

## 🚀 Tính năng

### Trang khách hàng (index.html)
- Xem thực đơn theo danh mục
- Đặt món trực tuyến
- Đặt bàn
- Giỏ hàng và thanh toán

### Trang quản trị (/admin)
- **Xác thực & Phân quyền**: SUPER_ADMIN và ADMIN
- **Quản lý món ăn**: Thêm, sửa, xóa món ăn, cập nhật giá
- **Quản lý danh mục**: Tổ chức thực đơn
- **Quản lý đơn hàng**: Xem và cập nhật trạng thái đơn hàng
- **Quản lý đặt bàn**: Xác nhận đặt bàn
- **Thư viện ảnh**: Quản lý hình ảnh nhà hàng
- **Cài đặt**: Cập nhật thông tin nhà hàng (SUPER_ADMIN)
- **Quản lý tài khoản**: Tạo và quản lý admin (SUPER_ADMIN)

## 📋 Yêu cầu

- Node.js 14+
- npm hoặc yarn

## 🔧 Cài đặt

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Khởi động server

```bash
npm start
```

Hoặc để development với auto-reload:

```bash
npm run dev
```

### Bước 3: Truy cập ứng dụng

- **Trang khách hàng**: http://localhost:3000
- **Thiết lập admin lần đầu**: http://localhost:3000/admin/setup.html
- **Đăng nhập admin**: http://localhost:3000/admin/login.html
- **Dashboard admin**: http://localhost:3000/admin/index.html

## 🔐 Thiết lập lần đầu

1. Mở http://localhost:3000/admin/setup.html
2. Tạo tài khoản SUPER_ADMIN đầu tiên
3. Đăng nhập vào hệ thống
4. Bắt đầu quản lý nhà hàng

## 👥 Vai trò người dùng

### SUPER_ADMIN
- Toàn quyền quản lý hệ thống
- Quản lý tài khoản admin
- Thay đổi cài đặt nhà hàng
- Quản lý tất cả chức năng

### ADMIN
- Quản lý món ăn và danh mục
- Quản lý đơn hàng và đặt bàn
- Quản lý thư viện ảnh
- **Không thể**: Tạo admin khác, thay đổi cài đặt hệ thống

## 🗄️ Cấu trúc Database

Hệ thống sử dụng SQLite với các bảng:
- `admin_users` - Tài khoản quản trị
- `categories` - Danh mục món ăn
- `menu_items` - Món ăn
- `orders` - Đơn hàng
- `order_items` - Chi tiết đơn hàng
- `reservations` - Đặt bàn
- `gallery_images` - Thư viện ảnh
- `restaurant_settings` - Cài đặt nhà hàng

Database tự động khởi tạo khi chạy server lần đầu với dữ liệu mẫu.

## 🔒 Bảo mật

- Mật khẩu được hash bằng bcrypt
- JWT tokens cho xác thực
- HTTP-only cookies
- Server-side authorization checks
- Input validation
- Role-based access control

## 📁 Cấu trúc thư mục

```
trau-tuoi-hien-beo/
├── admin/                  # Trang quản trị
│   ├── index.html         # Dashboard
│   ├── login.html         # Đăng nhập
│   ├── setup.html         # Thiết lập lần đầu
│   ├── menu.html          # Quản lý món ăn
│   ├── categories.html    # Quản lý danh mục
│   ├── orders.html        # Quản lý đơn hàng
│   ├── reservations.html  # Quản lý đặt bàn
│   ├── gallery.html       # Thư viện ảnh
│   ├── settings.html      # Cài đặt
│   ├── accounts.html      # Quản lý tài khoản
│   ├── admin.css          # Styles
│   └── admin.js           # Shared JS
├── index.html             # Trang khách hàng
├── server.js              # Express server
├── database.js            # Database setup
├── package.json
├── .env                   # Environment variables
└── restaurant.db          # SQLite database (auto-generated)
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/setup` - Tạo admin đầu tiên
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Thông tin người dùng hiện tại

### Menu
- `GET /api/menu` - Lấy danh sách món ăn
- `POST /api/menu` - Tạo món ăn mới (auth)
- `PUT /api/menu/:id` - Cập nhật món ăn (auth)
- `DELETE /api/menu/:id` - Xóa món ăn (auth)

### Categories
- `GET /api/categories` - Lấy danh mục
- `POST /api/categories` - Tạo danh mục (auth)
- `PUT /api/categories/:id` - Cập nhật (auth)
- `DELETE /api/categories/:id` - Xóa (auth)

### Orders
- `GET /api/orders` - Lấy đơn hàng (auth)
- `POST /api/orders` - Tạo đơn hàng
- `PUT /api/orders/:id/status` - Cập nhật trạng thái (auth)

### Reservations
- `GET /api/reservations` - Lấy đặt bàn (auth)
- `POST /api/reservations` - Tạo đặt bàn
- `PUT /api/reservations/:id/status` - Cập nhật trạng thái (auth)

### Settings
- `GET /api/settings` - Thông tin nhà hàng
- `PUT /api/settings` - Cập nhật (SUPER_ADMIN only)

### Admins
- `GET /api/admins` - Danh sách admin (SUPER_ADMIN only)
- `POST /api/admins` - Tạo admin (SUPER_ADMIN only)
- `PUT /api/admins/:id` - Cập nhật admin (SUPER_ADMIN only)

## 🔄 Tích hợp Admin - Customer

Trang khách hàng và admin chia sẻ CÙNG MỘT NGUỒN DỮ LIỆU:

1. Admin thay đổi giá món → Trang khách hàng tự động hiển thị giá mới
2. Admin đổi trạng thái món → Trang khách hàng cập nhật
3. Khách đặt hàng → Đơn hàng xuất hiện trong admin
4. Khách đặt bàn → Yêu cầu xuất hiện trong admin

## 🛠️ Development

### Chạy server development

```bash
npm run dev
```

Server sẽ tự động reload khi code thay đổi.

### Reset database

Xóa file `restaurant.db` và khởi động lại server để tạo database mới với dữ liệu mẫu.

## 📝 Thông tin nhà hàng

**TRÂU TƯƠI HIỀN BÉO**

- Địa chỉ: Số 303 phố Phúc Lâm, Nếnh, Việt Yên, Bắc Giang
- Điện thoại: 0986 710 752
- Giờ mở cửa: 06:00 – 02:00

## 🐛 Troubleshooting

### Port 3000 đã được sử dụng

Thay đổi PORT trong file `.env`:

```
PORT=3001
```

### Không thể đăng nhập

1. Kiểm tra database `restaurant.db` đã được tạo
2. Đảm bảo đã chạy `/admin/setup.html` để tạo admin đầu tiên
3. Xóa cookies trình duyệt và thử lại

### Lỗi CORS

Đảm bảo server đang chạy và frontend truy cập từ cùng domain hoặc đã cấu hình CORS đúng.

## 📄 License

ISC

## 👨‍💻 Support

Để được hỗ trợ, vui lòng liên hệ quản trị viên hệ thống.
