import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import session from 'express-session';
import dotenv from 'dotenv';

import dashboardRoutes from './routes/dashboard.js';
import mealRouter from './routes/meal.js';
import authRouter from './routes/auth.js';
import logMealRoutes from './routes/log_meal.js';
import userRoutes from './routes/user.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// View engine & middleware setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: "TOP_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Locals for all templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.title = "Nutrition App";
  res.locals.currentPath = req.path;
  next();
});

// MAIN FUNCTION (connect DB and load routers)
async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'myappdb'
  });

  // Add database to every request
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  // ✅ Load routes (after session + db)
  app.use(dashboardRoutes);
  app.use(authRouter);
  app.use(mealRouter);
  app.use(logMealRoutes);
  app.use('/', userRoutes);

  // Root index route
  app.get("/", async (req, res) => {
    if (!req.session.user) {
      return res.render("index", { loggedIn: false });
    }

    const userId = req.session.user.id;

    try {
      const [[user]] = await db.query(`
        SELECT height, weight, goal, gender, age
        FROM users WHERE id = ?
      `, [userId]);

      const [[meal]] = await db.query(`
        SELECT SUM(calories) AS totalCalories
        FROM meal_intake
        WHERE user_id = ? AND date = CURDATE()
      `, [userId]);

      // --- BMI calculation
      const heightM = user.height / 100;
      const bmi = (user.weight / (heightM * heightM)).toFixed(1);
      const status = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : "Overweight";
      const bmiAngle = Math.min((bmi / 40) * 180, 180);
      const bmiRadians = (bmiAngle * Math.PI) / 180;
      const bmiArcX = 125 + 105 * Math.cos(Math.PI - bmiRadians);
      const bmiArcY = 125 - 105 * Math.sin(bmiRadians);

      // --- Calorie Goal Calculation
      const age = user.age || 20;
      const gender = user.gender || "male";
      let bmr = gender === 'male'
        ? 10 * user.weight + 6.25 * user.height - 5 * age + 5
        : 10 * user.weight + 6.25 * user.height - 5 * age - 161;

      let activityFactor = 1.55;
      let calorieGoal = Math.round(bmr * activityFactor);
      if (user.goal === "cut") calorieGoal -= 300;
      else if (user.goal === "gain") calorieGoal += 300;

      const todayCalories = meal.totalCalories || 0;
      const calAngle = Math.min((todayCalories / calorieGoal) * 180, 180);
      const calRadians = (calAngle * Math.PI) / 180;
      const calArcX = 125 + 105 * Math.cos(Math.PI - calRadians);
      const calArcY = 125 - 105 * Math.sin(calRadians);

      res.render("index", {
        loggedIn: true,
        bmi,
        bmiStatus: status,
        bmiArcX: bmiArcX.toFixed(0),
        bmiArcY: bmiArcY.toFixed(0),
        calorieIntake: todayCalories,
        calArcX: calArcX.toFixed(0),
        calArcY: calArcY.toFixed(0),
        todayCalories,
        calorieGoal
      });

    } catch (err) {
      console.error("❌ Failed to load index:", err);
      res.status(500).send("Server error");
    }
  });

  // Static pages
  app.get('/faq', (req, res) => res.render('faq'));
  app.get('/about', (req, res) => res.render('about'));
  app.get('/Change_goal', (req, res) => res.render('Change_goal'));
  app.get('/Update_physical', (req, res) => res.render('Update_physical'));
  app.get('/update-physical', (req, res) => res.render('update_physical'));

  app.post('/update-physical', async (req, res) => {
    const { height, weight } = req.body;
    const heightNum = Number(height);
    const weightNum = Number(weight);
    const userId = req.session.user?.id;

    if (!userId) return res.redirect('/login');
    if (heightNum <= 0 || weightNum <= 0 || isNaN(heightNum) || isNaN(weightNum)) {
      return res.status(400).send('Height and weight must be greater than 0.');
    }

    try {
      await db.query('UPDATE users SET height = ?, weight = ? WHERE id = ?', [heightNum, weightNum, userId]);
      res.redirect('/dashboard');
    } catch (err) {
      console.error("❌ Error updating physical info:", err);
      res.status(500).send("Failed to update");
    }
  });

  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (results.length === 0) return res.status(401).send('❌ Email not found');
      const user = results[0];
      if (user.password !== password) return res.status(401).send('❌ Incorrect password');

      req.session.user = { id: user.id, email: user.email };
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).send('❌ Server error');
    }
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

// Run main
main().catch(err => {
  console.error("❌ App failed to start:", err);
});
