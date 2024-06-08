// const express = require("express");
// const bodyParser = require("body-parser");
// const { Sequelize, Model, DataTypes } = require("sequelize");
// var router = express.Router();

// // Create Sequelize instance
// const sequelize = new Sequelize({
//   dialect: "sqlite",
//   storage: "./database.sqlite",
// });

// class User extends Model {}
// User.init(
//   {
//     name: DataTypes.STRING,
//     email: DataTypes.STRING,
//     phone: DataTypes.STRING,
//   },
//   { sequelize, modelName: "user" }
// );

// class Coffee extends Model {}
// Coffee.init(
//   {
//     name: DataTypes.STRING,
//     price: DataTypes.FLOAT,
//   },
//   { sequelize, modelName: "coffee" }
// );

// class Order extends Model {}
// Order.init(
//   {
//     userId: DataTypes.INTEGER,
//     coffeeId: DataTypes.INTEGER,
//     quantity: DataTypes.INTEGER,
//   },
//   { sequelize, modelName: "order" }
// );

// class Customer extends Model {}
// Customer.init(
//   {
//     name: DataTypes.STRING,
//     email: DataTypes.STRING,
//   },
//   { sequelize, modelName: "customer" }
// );

// // Define relationships
// User.hasMany(Order);
// Order.belongsTo(User);
// Coffee.hasMany(Order);
// Order.belongsTo(Coffee);

// // Sync models with database
// sequelize.sync();

// // Middleware for parsing request body
// router.use(bodyParser.urlencoded({ extended: false }));
// router.use(bodyParser.json());

// /* GET home page. */
// router.get("/", function (req, res, next) {
//   res.render("index", { title: "Express" });
// });

// // CRUD routes for User model
// router.get("/users", async (req, res) => {
//   const users = await User.findAll();
//   res.json(users);
// });

// router.get("/users/:id", async (req, res) => {
//   const user = await User.findByPk(req.params.id);
//   res.json(user);
// });

// router.post("/users", async (req, res) => {
//   const user = await User.create(req.body);
//   res.json(user);
// });

// router.put("/users/:id", async (req, res) => {
//   const user = await User.findByPk(req.params.id);
//   if (user) {
//     await user.update(req.body);
//     res.json(user);
//   } else {
//     res.status(404).json({ message: "User not found" });
//   }
// });

// router.delete("/users/:id", async (req, res) => {
//   const user = await User.findByPk(req.params.id);
//   if (user) {
//     await user.destroy();
//     res.json({ message: "User deleted" });
//   } else {
//     res.status(404).json({ message: "User not found" });
//   }
// });

// // CRUD routes for Coffee model
// router.get("/coffees", async (req, res) => {
//   const coffees = await Coffee.findAll();
//   res.json(coffees);
// });

// router.get("/coffees/:id", async (req, res) => {
//   const coffee = await Coffee.findByPk(req.params.id);
//   res.json(coffee);
// });

// router.post("/coffees", async (req, res) => {
//   const coffee = await Coffee.create(req.body);
//   res.json(coffee);
// });

// router.put("/coffees/:id", async (req, res) => {
//   const coffee = await Coffee.findByPk(req.params.id);
//   if (coffee) {
//     await coffee.update(req.body);
//     res.json(coffee);
//   } else {
//     res.status(404).json({ message: "Coffee not found" });
//   }
// });

// router.delete("/coffees/:id", async (req, res) => {
//   const coffee = await Coffee.findByPk(req.params.id);
//   if (coffee) {
//     await coffee.destroy();
//     res.json({ message: "Coffee deleted" });
//   } else {
//     res.status(404).json({ message: "Coffee not found" });
//   }
// });

// // CRUD routes for Order model
// router.get("/orders", async (req, res) => {
//   const orders = await Order.findAll({ include: [User, Coffee] });
//   res.json(orders);
// });

// router.get("/orders/:id", async (req, res) => {
//   const order = await Order.findByPk(req.params.id, {
//     include: [User, Coffee],
//   });
//   res.json(order);
// });

// router.post("/orders", async (req, res) => {
//   const { userId, coffeeId, quantity } = req.body;

//   try {
//     // Kiểm tra userId
//     const user = await User.findByPk(userId);
//     if (!user) {
//       return res.status(400).json({ message: "User not found" });
//     }

//     // Kiểm tra coffeeId
//     const coffee = await Coffee.findByPk(coffeeId);
//     if (!coffee) {
//       return res.status(400).json({ message: "Coffee not found" });
//     }

//     // Tạo đơn đặt hàng
//     const order = await Order.create({ userId, coffeeId, quantity });
//     res.status(201).json(order);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

// router.put("/orders/:id", async (req, res) => {
//   const order = await Order.findByPk(req.params.id);
//   if (order) {
//     await order.update(req.body);
//     res.json(order);
//   } else {
//     res.status(404).json({ message: "Order not found" });
//   }
// });

// router.delete("/orders/:id", async (req, res) => {
//   const order = await Order.findByPk(req.params.id);
//   if (order) {
//     await order.destroy();
//     res.json({ message: "Order deleted" });
//   } else {
//     res.status(404).json({ message: "Order not found" });
//   }
// });

// module.exports = router;
