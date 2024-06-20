const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const pool = new Pool({
  user: "default", // Thay bằng tên người dùng PostgreSQL của bạn
  host: "ep-long-king-a1ogp90a-pooler.ap-southeast-1.aws.neon.tech",
  database: "verceldb", // Thay bằng tên cơ sở dữ liệu của bạn
  password: "YWz91cMtnqkL", // Thay bằng mật khẩu của bạn
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // you may need this for self-signed certificates
  },
  sslmode: "require", // ensure SSL is required
});

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("Connected to PostgreSQL");
  release();
});

// Đăng ký người dùng mới
router.post("/register", async (req, res) => {
  const { username, password, full_name, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      "INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, hashedPassword, full_name, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Đăng nhập
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).send("Invalid credentials");
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send("Invalid credentials");
    }
    const token = jwt.sign({ id: user.id, role: user.role }, "your_jwt_secret");
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Middleware xác thực JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, "your_jwt_secret", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Tuyến đường bảo vệ
router.get("/protected", authenticateToken, (req, res) => {
  // Đã xác thực thành công, tiếp tục xử lý yêu cầu
  res.status(200).send("Protected route accessed successfully");
});

router.post("/orders", authenticateToken, async (req, res) => {
  const items = req.body.newOrder; // Expecting an array of items
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let total = 0;

    for (const orderDetail of items) {
      total += parseFloat(orderDetail.price) * orderDetail.quantity;
    }

    const orderResult = await client.query(
      "INSERT INTO orders (user_id, total_price, status) VALUES ($1, $2, $3) RETURNING id",
      [0, total, false]
    );
    const orderId = orderResult.rows[0].id;

    const itemQueries = items.map((item) => {
      return client.query(
        "INSERT INTO order_details (order_id, item_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [orderId, item.item_id, item.quantity, item.price]
      );
    });

    await Promise.all(itemQueries);

    await client.query("COMMIT");
    res.status(201).json({ id: orderId, total, items });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).send("Server error");
  } finally {
    client.release();
  }
});

// Lấy tất cả giao dịch
router.get("/orders", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM orders");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Lấy tất cả giao dịch hôm nay
router.get("/todayorders", authenticateToken, async (req, res) => {
  try {
    const currentDate = new Date().toISOString().slice(0, 10); // Lấy ngày hiện tại theo định dạng YYYY-MM-DD

    const result = await pool.query(
      "SELECT * FROM orders where DATE(order_date) = $1",
      [currentDate]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.delete("/orders/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Delete from order_items table first due to foreign key constraint
    await client.query("DELETE FROM order_details WHERE order_id = $1", [id]);

    // Then delete from orders table
    await client.query("DELETE FROM orders WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.status(204).send(); // No Content
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).send("Server error");
  } finally {
    client.release();
  }
});

router.get("/orderdetails/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT order_details.*, items.name
       FROM order_details
       LEFT JOIN items ON items.id = order_details.item_id
       WHERE order_details.order_id = $1
       ORDER BY order_details.id`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.put("/orderdetails/:id", authenticateToken, async (req, res) => {
  const { id } = req.params; // Corrected this line
  const newOrderDetails = req.body.newOrderDetails; // Assuming you receive the new order details in the request body

  try {
    // Start a transaction
    await pool.query("BEGIN");

    // Delete existing order details
    await pool.query("DELETE FROM order_details WHERE order_id = $1", [id]);

    let total = 0;

    // Insert new order details
    for (const orderDetail of newOrderDetails) {
      total += parseFloat(orderDetail.price);
      await pool.query(
        "INSERT INTO order_details (order_id, item_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [id, orderDetail.item_id, orderDetail.quantity, orderDetail.price]
      );
    }

    // Update the total price in the order table
    await pool.query("UPDATE orders SET total_price = $1 WHERE id = $2", [
      total,
      id,
    ]);

    // Commit the transaction
    await pool.query("COMMIT");

    // Fetch the updated order details and return them
    const result = await pool.query(
      `SELECT order_details.*, items.name
       FROM order_details
       LEFT JOIN items ON items.id = order_details.item_id
       WHERE order_details.order_id = $1
       ORDER BY order_details.id`,
      [id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    // Rollback the transaction if an error occurs
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Lấy tất cả categories
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Thêm category mới
router.post("/categories", authenticateToken, async (req, res) => {
  const { name, description, image } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO categories (name, description, image) VALUES ($1, $2, $3) RETURNING *",
      [name, description, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Cập nhật category
router.put("/categories/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, image } = req.body;
  try {
    const result = await pool.query(
      "UPDATE categories SET name = $1, description = $2, image = $3 WHERE id = $4 RETURNING *",
      [name, description, image, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
// Xóa category
router.delete("/categories/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if there are any items associated with the category
    const checkItems = await pool.query(
      "SELECT 1 FROM items WHERE category_id = $1 LIMIT 1",
      [id]
    );

    if (checkItems.rows.length > 0) {
      return res
        .status(400)
        .send("Category cannot be deleted because it contains items.");
    }

    // Get the category details before deleting
    const categoryResult = await pool.query(
      "SELECT * FROM categories WHERE id = $1",
      [id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).send("Category not found");
    }

    const deletedCategory = categoryResult.rows[0];

    // If no items are found, proceed to delete the category
    await pool.query("DELETE FROM categories WHERE id = $1", [id]);

    // Return the deleted category details
    res.status(200).json(deletedCategory);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Lấy tất cả items
router.get("/items", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM items ORDER BY category_id");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Thêm item mới
router.post("/items", authenticateToken, async (req, res) => {
  const { name, price, description, category_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO items (name, price, description, category_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, price, description, category_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Cập nhật item
router.put("/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, price, description, category_id } = req.body;
  try {
    const result = await pool.query(
      "UPDATE items SET name = $1, price = $2, description = $3, category_id = $4 WHERE id = $5 RETURNING *",
      [name, price, description, category_id, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Xóa item
router.delete("/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM items WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
