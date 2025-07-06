// routes/auth.js
import express from "express";
import bcrypt from "bcrypt";

const router = express.Router();
const saltRounds = 10;

// GET: Register Page
router.get("/register", (req, res) => {
  res.render("register");
});

// POST: Register Logic
router.post("/register", async (req, res) => {
  const {
    first_name,
    last_name,
    age,
    gender,
    height,
    weight,
    goal,
    email,
    password
  } = req.body;

  try {
    // Check if email already exists
    const [existingUser] = await req.db.execute(
      "SELECT * FROM users WHERE email = ?", [email]
    );

    if (existingUser.length > 0) {
      return res.redirect("/login"); // User already registered
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await req.db.execute(
      `INSERT INTO users 
        (first_name, last_name, age, gender, height, weight, goal, email, password) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, age, gender, height, weight, goal, email, hashedPassword]
    );

    req.session.user = { email };
    res.redirect("/dashboard"); // ✅ redirect fixed

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).send("Something went wrong during registration.");
  }
});

// GET: Login Page
router.get("/login", (req, res) => {
  res.render("login");
});

// POST: Login Logic
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await req.db.execute(
      "SELECT * FROM users WHERE email = ?", [email]
    );

    if (rows.length === 0) {
      return res.redirect("/register"); // No user found
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.user = { id: user.id, email: user.email };
      res.redirect("/dashboard"); // ✅ fixed here
    } else {
      res.redirect("/login"); // Incorrect password
    }

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Login failed. Try again.");
  }
});

// GET: Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export default router;
