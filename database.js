const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'restaurant.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
  // Admin users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Menu items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category_id INTEGER NOT NULL,
      image TEXT,
      icon TEXT,
      available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      order_type TEXT NOT NULL CHECK(order_type IN ('dine-in', 'takeaway', 'delivery')),
      status TEXT NOT NULL CHECK(status IN ('new', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled')),
      address TEXT,
      notes TEXT,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      delivery_fee REAL DEFAULT 0,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      menu_item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      notes TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )
  `);

  // Reservations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      reservation_date DATE NOT NULL,
      reservation_time TIME NOT NULL,
      number_of_guests INTEGER NOT NULL,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Gallery images table
  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      category TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Restaurant settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurant_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      restaurant_name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      opening_hours TEXT NOT NULL,
      description TEXT,
      social_links TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed initial data if tables are empty
  seedInitialData();
}

function seedInitialData() {
  // Check if categories exist
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();

  if (categoryCount.count === 0) {
    // Insert default categories
    const categories = [
      { name: 'Các món về trâu', description: 'Những món ăn đặc sắc được chế biến từ trâu tươi.', display_order: 1 },
      { name: 'Lẩu', description: 'Lẩu nóng hổi, thơm ngon, phù hợp cho gia đình và bạn bè.', display_order: 2 },
      { name: 'Các món phở', description: 'Phở và những món ăn đậm đà từ thịt trâu tươi.', display_order: 3 },
      { name: 'Đồ uống', description: 'Đồ uống giải khát và các loại rượu truyền thống.', display_order: 4 }
    ];

    const insertCategory = db.prepare('INSERT INTO categories (name, description, display_order) VALUES (?, ?, ?)');
    categories.forEach(cat => {
      insertCategory.run(cat.name, cat.description, cat.display_order);
    });

    // Get category IDs
    const trauCat = db.prepare("SELECT id FROM categories WHERE name = 'Các món về trâu'").get();
    const lauCat = db.prepare("SELECT id FROM categories WHERE name = 'Lẩu'").get();
    const phoCat = db.prepare("SELECT id FROM categories WHERE name = 'Các món phở'").get();
    const drinkCat = db.prepare("SELECT id FROM categories WHERE name = 'Đồ uống'").get();

    // Insert menu items
    const menuItems = [
      // Các món về trâu
      { name: 'Trâu xào cháy tỏi', price: 159000, description: 'Thịt trâu tươi mềm, xào cùng tỏi thơm vàng, mang đến hương vị đậm đà và hấp dẫn.', category_id: trauCat.id, icon: '🥩' },
      { name: 'Trâu nhúng dấm', price: 159000, description: 'Thịt trâu tươi nhúng trong nước dùng chua thanh, kết hợp cùng rau và gia vị.', category_id: trauCat.id, icon: '🥩' },
      { name: 'Trâu chiên vừng', price: 159000, description: 'Thịt trâu thơm ngon, kết hợp cùng lớp vừng rang béo thơm.', category_id: trauCat.id, icon: '🥩' },
      { name: 'Trâu nướng tảng', price: 159000, description: 'Thịt trâu tươi được nướng nguyên tảng, thơm lừng và đậm đà.', category_id: trauCat.id, icon: '🔥' },
      { name: 'Sườn trâu nướng', price: 159000, description: 'Sườn trâu được tẩm ướp gia vị, nướng thơm và đậm vị.', category_id: trauCat.id, icon: '🍖' },
      { name: 'Nộm trâu', price: 159000, description: 'Thịt trâu kết hợp cùng rau củ và nước trộn chua ngọt.', category_id: trauCat.id, icon: '🥗' },
      { name: 'Xách trâu xào khế', price: 159000, description: 'Xách trâu giòn ngon, kết hợp cùng vị chua thanh của khế.', category_id: trauCat.id, icon: '🥩' },

      // Lẩu
      { name: 'Lẩu thập cẩm', price: 349000, description: 'Lẩu nóng hổi với nhiều nguyên liệu tươi ngon và nước dùng đậm đà.', category_id: lauCat.id, icon: '🍲' },
      { name: 'Lẩu trâu tươi', price: 349000, description: 'Lẩu trâu thơm ngon với thịt trâu tươi và nước dùng đậm đà.', category_id: lauCat.id, icon: '🍲' },
      { name: 'Thịt trâu thêm', price: 69000, description: 'Phần thịt trâu tươi dùng để thêm vào nồi lẩu.', category_id: lauCat.id, icon: '🥩' },
      { name: 'Rau thêm', price: 30000, description: 'Rau tươi dùng kèm với lẩu.', category_id: lauCat.id, icon: '🥬' },
      { name: 'Đĩa phở', price: 15000, description: 'Bánh phở tươi dùng kèm.', category_id: lauCat.id, icon: '🍜' },

      // Các món phở
      { name: 'Phở trâu tươi', price: 35000, description: 'Bánh phở mềm kết hợp cùng thịt trâu tươi và nước dùng thơm ngon.', category_id: phoCat.id, icon: '🍜' },
      { name: 'Phở trâu đặc biệt', price: 50000, description: 'Tô phở đặc biệt với nhiều nguyên liệu hấp dẫn.', category_id: phoCat.id, icon: '🍜' },
      { name: 'Phở trâu xào', price: 50000, description: 'Bánh phở được xào cùng thịt trâu tươi và rau.', category_id: phoCat.id, icon: '🍜' },
      { name: 'Mì trâu xào', price: 50000, description: 'Mì xào thơm ngon kết hợp cùng thịt trâu tươi.', category_id: phoCat.id, icon: '🍝' },
      { name: 'Phở trâu chiên giòn', price: 100000, description: 'Bánh phở chiên giòn, kết hợp cùng thịt trâu và nước sốt đậm đà.', category_id: phoCat.id, icon: '🍜' },
      { name: 'Bánh bao trâu', price: 100000, description: 'Bánh bao nóng hổi với nhân thịt trâu.', category_id: phoCat.id, icon: '🥟' },
      { name: 'Quẩy', price: 10000, description: 'Quẩy giòn thơm, phù hợp ăn kèm phở.', category_id: phoCat.id, icon: '🥖' },

      // Đồ uống
      { name: 'Nước lọc', price: 10000, description: '', category_id: drinkCat.id, icon: '💧' },
      { name: 'Nước ngọt các loại', price: 20000, description: '', category_id: drinkCat.id, icon: '🥤' },
      { name: 'Rượu men lá', price: 30000, description: '', category_id: drinkCat.id, icon: '🍶' },
      { name: 'Rượu nếp cái', price: 30000, description: '', category_id: drinkCat.id, icon: '🍶' },
      { name: 'Rượu ba kích', price: 30000, description: '', category_id: drinkCat.id, icon: '🍶' }
    ];

    const insertMenuItem = db.prepare('INSERT INTO menu_items (name, description, price, category_id, icon, available) VALUES (?, ?, ?, ?, ?, ?)');
    menuItems.forEach(item => {
      insertMenuItem.run(item.name, item.description, item.price, item.category_id, item.icon, 1);
    });
  }

  // Check if restaurant settings exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM restaurant_settings').get();

  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO restaurant_settings (id, restaurant_name, address, phone, opening_hours, description)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(
      'TRÂU TƯƠI HIỀN BÉO',
      'Số 303 phố Phúc Lâm, Nếnh, Việt Yên, Bắc Giang, Việt Nam',
      '0986 710 752',
      '06:00 – 02:00',
      'Đậm đà hương vị Việt. Những món ăn đặc sắc từ trâu tươi, được chế biến đậm đà theo hương vị truyền thống, trong không gian xanh gần gũi với thiên nhiên.'
    );
  }
}

// Initialize on module load
initDatabase();

module.exports = db;
