const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'trau-tuoi-hien-beo-secret-key-change-in-production';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Phiên đăng nhập không hợp lệ' });
  }
};

// Role authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }
    next();
  };
};

// ==================== AUTHENTICATION ROUTES ====================

// Check if setup is needed
app.get('/api/auth/check-setup', (req, res) => {
  const admin = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  res.json({ needsSetup: admin.count === 0 });
});

// First-time setup
app.post('/api/auth/setup', (req, res) => {
  try {
    // Check if any admin exists
    const existingAdmin = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();

    if (existingAdmin.count > 0) {
      return res.status(400).json({ error: 'Hệ thống đã được thiết lập' });
    }

    const { name, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create first SUPER_ADMIN
    const result = db.prepare(`
      INSERT INTO admin_users (name, email, phone, password_hash, role, active)
      VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 1)
    `).run(name, email, phone, passwordHash);

    res.json({
      success: true,
      message: 'Tạo quản trị viên thành công',
      adminId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Find admin
    const admin = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);

    if (!admin) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    if (!admin.active) {
      return res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // Check password
    const validPassword = bcrypt.compareSync(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }

    // Create token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict'
    });

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Get current admin
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const admin = db.prepare('SELECT id, name, email, phone, role, active FROM admin_users WHERE id = ?').get(req.admin.id);

  if (!admin) {
    return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
  }

  res.json({ admin });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Đăng xuất thành công' });
});

// ==================== ADMIN ACCOUNT MANAGEMENT ====================

// Get all admins (SUPER_ADMIN only)
app.get('/api/admins', authenticateToken, requireRole('SUPER_ADMIN'), (req, res) => {
  const admins = db.prepare('SELECT id, name, email, phone, role, active, created_at FROM admin_users ORDER BY created_at DESC').all();
  res.json({ admins });
});

// Create admin account (SUPER_ADMIN only)
app.post('/api/admins', authenticateToken, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const { name, email, phone, role, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Check duplicate email
    const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email này đã được sử dụng' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create admin
    const result = db.prepare(`
      INSERT INTO admin_users (name, email, phone, password_hash, role, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(name, email, phone, passwordHash, role);

    res.json({
      success: true,
      message: 'Tạo tài khoản thành công',
      adminId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Update admin (SUPER_ADMIN only)
app.put('/api/admins/:id', authenticateToken, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, active } = req.body;

    // Validation
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Check if trying to disable the last SUPER_ADMIN
    if (active === 0 || active === false) {
      const admin = db.prepare('SELECT role FROM admin_users WHERE id = ?').get(id);
      if (admin && admin.role === 'SUPER_ADMIN') {
        const activeSuperAdmins = db.prepare('SELECT COUNT(*) as count FROM admin_users WHERE role = "SUPER_ADMIN" AND active = 1').get();
        if (activeSuperAdmins.count <= 1) {
          return res.status(400).json({ error: 'Không thể vô hiệu hóa SUPER_ADMIN cuối cùng' });
        }
      }
    }

    db.prepare(`
      UPDATE admin_users
      SET name = ?, email = ?, phone = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, email, phone, role, active ? 1 : 0, id);

    res.json({ success: true, message: 'Cập nhật tài khoản thành công' });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// ==================== CATEGORY ROUTES ====================

// Get all categories
app.get('/api/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order, name').all();
  res.json({ categories });
});

// Create category
app.post('/api/categories', authenticateToken, (req, res) => {
  try {
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vui lòng nhập tên danh mục' });
    }

    const result = db.prepare(`
      INSERT INTO categories (name, description, image)
      VALUES (?, ?, ?)
    `).run(name, description, image);

    res.json({
      success: true,
      message: 'Tạo danh mục thành công',
      categoryId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Update category
app.put('/api/categories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vui lòng nhập tên danh mục' });
    }

    db.prepare(`
      UPDATE categories
      SET name = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, image, id);

    res.json({ success: true, message: 'Cập nhật danh mục thành công' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Delete category
app.delete('/api/categories/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has menu items
    const items = db.prepare('SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?').get(id);

    if (items.count > 0) {
      return res.status(400).json({ error: 'Không thể xóa danh mục có món ăn' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.json({ success: true, message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// ==================== MENU ITEM ROUTES ====================

// Get all menu items
app.get('/api/menu', (req, res) => {
  const { category, search } = req.query;

  let query = `
    SELECT m.*, c.name as category_name
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE 1=1
  `;

  const params = [];

  if (category) {
    query += ' AND m.category_id = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (m.name LIKE ? OR m.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY c.display_order, m.name';

  const items = db.prepare(query).all(...params);
  res.json({ items });
});

// Get single menu item
app.get('/api/menu/:id', (req, res) => {
  const item = db.prepare(`
    SELECT m.*, c.name as category_name
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.id = ?
  `).get(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Không tìm thấy món ăn' });
  }

  res.json({ item });
});

// Create menu item
app.post('/api/menu', authenticateToken, (req, res) => {
  try {
    const { name, description, price, category_id, image, icon, available } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Giá không hợp lệ' });
    }

    const result = db.prepare(`
      INSERT INTO menu_items (name, description, price, category_id, image, icon, available)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, price, category_id, image, icon, available ? 1 : 0);

    res.json({
      success: true,
      message: 'Tạo món ăn thành công',
      itemId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Update menu item
app.put('/api/menu/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, image, icon, available } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Giá không hợp lệ' });
    }

    db.prepare(`
      UPDATE menu_items
      SET name = ?, description = ?, price = ?, category_id = ?, image = ?, icon = ?, available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, price, category_id, image, icon, available ? 1 : 0, id);

    res.json({ success: true, message: 'Cập nhật món ăn thành công' });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Delete menu item
app.delete('/api/menu/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    res.json({ success: true, message: 'Xóa món ăn thành công' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// ==================== ORDER ROUTES ====================

// Get all orders
app.get('/api/orders', authenticateToken, (req, res) => {
  const { status, date } = req.query;

  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (date) {
    query += ' AND DATE(created_at) = ?';
    params.push(date);
  }

  query += ' ORDER BY created_at DESC';

  const orders = db.prepare(query).all(...params);
  res.json({ orders });
});

// Get single order with items
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);

  res.json({ order: { ...order, items } });
});

// Create order (from customer website)
app.post('/api/orders', (req, res) => {
  try {
    const { customer_name, phone, email, order_type, address, notes, items } = req.body;

    if (!customer_name || !phone || !order_type || !items || items.length === 0) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Generate order number
    const orderNumber = 'DH' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    const deliveryFee = order_type === 'delivery' ? 30000 : 0;
    const total = subtotal + deliveryFee;

    // Create order
    const orderResult = db.prepare(`
      INSERT INTO orders (order_number, customer_name, phone, email, order_type, status, address, notes, subtotal, delivery_fee, total)
      VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)
    `).run(orderNumber, customer_name, phone, email, order_type, address, notes, subtotal, deliveryFee, total);

    const orderId = orderResult.lastInsertRowid;

    // Create order items
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, price, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    items.forEach(item => {
      insertItem.run(orderId, item.id, item.name, item.quantity, item.price, item.notes || null);
    });

    res.json({
      success: true,
      message: 'Đặt hàng thành công',
      orderNumber,
      orderId
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Update order status
app.put('/api/orders/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Get order statistics
app.get('/api/orders/stats/dashboard', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const todayOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?').get(today);
  const todayRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE DATE(created_at) = ? AND status != "cancelled"').get(today);
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get();

  res.json({
    todayOrders: todayOrders.count,
    todayRevenue: todayRevenue.total,
    totalOrders: totalOrders.count
  });
});

// ==================== RESERVATION ROUTES ====================

// Get all reservations
app.get('/api/reservations', authenticateToken, (req, res) => {
  const { status, date } = req.query;

  let query = 'SELECT * FROM reservations WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (date) {
    query += ' AND reservation_date = ?';
    params.push(date);
  }

  query += ' ORDER BY reservation_date DESC, reservation_time DESC';

  const reservations = db.prepare(query).all(...params);
  res.json({ reservations });
});

// Create reservation (from customer website)
app.post('/api/reservations', (req, res) => {
  try {
    const { customer_name, phone, reservation_date, reservation_time, number_of_guests, notes } = req.body;

    if (!customer_name || !phone || !reservation_date || !reservation_time || !number_of_guests) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const result = db.prepare(`
      INSERT INTO reservations (customer_name, phone, reservation_date, reservation_time, number_of_guests, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(customer_name, phone, reservation_date, reservation_time, number_of_guests, notes);

    res.json({
      success: true,
      message: 'Đặt bàn thành công',
      reservationId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Update reservation status
app.put('/api/reservations/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    db.prepare(`
      UPDATE reservations
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Get reservation statistics
app.get('/api/reservations/stats/dashboard', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayReservations = db.prepare('SELECT COUNT(*) as count FROM reservations WHERE reservation_date = ?').get(today);

  res.json({
    todayReservations: todayReservations.count
  });
});

// ==================== RESTAURANT SETTINGS ====================

// Get restaurant settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM restaurant_settings WHERE id = 1').get();
  res.json({ settings: settings || {} });
});

// Update restaurant settings (SUPER_ADMIN only)
app.put('/api/settings', authenticateToken, requireRole('SUPER_ADMIN'), (req, res) => {
  try {
    const { restaurant_name, address, phone, opening_hours, description, social_links } = req.body;

    if (!restaurant_name || !address || !phone || !opening_hours) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    db.prepare(`
      UPDATE restaurant_settings
      SET restaurant_name = ?, address = ?, phone = ?, opening_hours = ?, description = ?, social_links = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(restaurant_name, address, phone, opening_hours, description, social_links);

    res.json({ success: true, message: 'Cập nhật thông tin thành công' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// ==================== GALLERY ROUTES ====================

// Get all gallery images
app.get('/api/gallery', (req, res) => {
  const images = db.prepare('SELECT * FROM gallery_images ORDER BY display_order, created_at DESC').all();
  res.json({ images });
});

// Create gallery image
app.post('/api/gallery', authenticateToken, (req, res) => {
  try {
    const { title, description, image_url, category } = req.body;

    if (!title || !image_url) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const result = db.prepare(`
      INSERT INTO gallery_images (title, description, image_url, category)
      VALUES (?, ?, ?, ?)
    `).run(title, description, image_url, category);

    res.json({
      success: true,
      message: 'Thêm hình ảnh thành công',
      imageId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create gallery image error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Update gallery image
app.put('/api/gallery/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, display_order } = req.body;

    db.prepare(`
      UPDATE gallery_images
      SET title = ?, description = ?, category = ?, display_order = ?
      WHERE id = ?
    `).run(title, description, category, display_order || 0, id);

    res.json({ success: true, message: 'Cập nhật hình ảnh thành công' });
  } catch (error) {
    console.error('Update gallery image error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Delete gallery image
app.delete('/api/gallery/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM gallery_images WHERE id = ?').run(id);
    res.json({ success: true, message: 'Xóa hình ảnh thành công' });
  } catch (error) {
    console.error('Delete gallery image error:', error);
    res.status(500).json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin setup: http://localhost:${PORT}/admin/setup.html`);
  console.log(`Admin login: http://localhost:${PORT}/admin/login.html`);
  console.log(`Customer site: http://localhost:${PORT}/index.html`);
});
