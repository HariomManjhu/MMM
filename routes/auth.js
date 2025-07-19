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
    password,
    role,
    mess_name,
    mess_description,
    mess_address,
    contact_number
  } = req.body;

  try {
    // Password constraints
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.redirect('/register?toast=Password+is+not+strong+enough&toastType=error');
    }

    // Check if user exists
    const [existingUser] = await req.db.execute(
      "SELECT * FROM users WHERE email = ?", [email]
    );
    if (existingUser.length > 0) {
      return res.redirect('/register?toast=Email+already+registered&toastType=error');
    }

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [userResult] = await req.db.execute(
      `INSERT INTO users 
        (first_name, last_name, age, gender, height, weight, goal, email, password, role) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, age, gender, height, weight, goal, email, hashedPassword, role]
    );
    const userId = userResult.insertId;

    if (role === 'mess_operator') {
      // Insert mess operator details
      await req.db.execute(
        `INSERT INTO mess_operator_details (user_id, mess_name, mess_description, mess_address, contact_number)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, mess_name, mess_description, mess_address, contact_number]
      );
      // Create mess entry and link to this user
      await req.db.execute(
        `INSERT INTO mess (mess_name, description, owner_id)
         VALUES (?, ?, ?)`,
        [mess_name, mess_description, userId]
      );
    }

    return res.redirect("/login?toast=Registration+successful!+Please+login.");
  } catch (error) {
    console.error(error);
    res.redirect('/register?toast=Something+went+wrong&toastType=error');
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
      return res.redirect('/login?toast=No+account+found+with+that+email&toastType=error');
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.user = { id: user.id, email: user.email };
      res.redirect("/dashboard");
    } else {
      res.redirect('/login?toast=Incorrect+password&toastType=error');
    }

  } catch (err) {
    console.error("Login Error:", err);
    res.redirect('/login?toast=Login+failed,+please+try+again&toastType=error');
  }
});

// GET: Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export default router;
