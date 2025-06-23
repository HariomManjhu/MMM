import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import session from 'express-session';
import mealRouter from './routes/meal.js';
import authRouter from './routes/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express(); // ✅ move this to top before any app.use()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "TOP_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routers
app.use(authRouter);
app.use(mealRouter);

// Home page
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/faq', (req, res) => {
  res.render('faq'); 
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
