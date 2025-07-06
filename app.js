import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import session from 'express-session';
import mealRouter from './routes/meal.js';
import authRouter from './routes/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set EJS & Public Paths
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(
  session({
    secret: "TOP_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
  })
);

// Make session available in EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.title = "Nutrition App"; 
  next();
});

async function main() {
  // DB Connection
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'myappdb'
  });

  // Attach DB to every request
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  // Routers
  app.use(authRouter);
  app.use(mealRouter);

  // Pages
  app.get("/", (req, res) => {
    res.render("index", { session: req.session });
  });

  app.get('/faq', (req, res) => {
    res.render('faq');
  });

  app.get('/dashboard', (req, res) => {
    res.render('dashboard');
  });

  app.get('/about', (req, res) => {
    res.render('about');
  });

  app.get('/logmeal', (req, res) => {
    res.render('log_meal');
  });

 app.get('/Change_goal', (req, res) => {
    res.render('Change_goal');
});
  app.get('/Update_physical', (req, res) => {
    res.render('Update_physical');
});

  app.get('/update-physical', (req, res) => {
    res.render('update_physical');
  });
app.post('/update-physical', (req, res) => {
  const { height, weight, activity } = req.body;

  // Convert values to numbers
  const heightNum = Number(height);
  const weightNum = Number(weight);

  // Validation
  if (heightNum <= 0 || weightNum <= 0 || isNaN(heightNum) || isNaN(weightNum)) {
    return res.status(400).send('Height and weight must be greater than 0.');
  }

  // TODO: Store the data in your database or session

  // For now, just log and redirect to homepage or dashboard
  console.log('✅ Physical info updated:', { heightNum, weightNum, activity });

  res.redirect('/dashboard'); // change to your actual destination
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [results] = await req.db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (results.length === 0) {
      return res.status(401).send('❌ Email not found');
    }

    const user = results[0];

    if (user.password !== password) {
      return res.status(401).send('❌ Incorrect password');
    }

    // Save session and redirect
    req.session.user = { id: user.id, email: user.email };
    return res.redirect('/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).send('❌ Server error');
  }
});



  // Server Start
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error("App failed to start:", err);
});
