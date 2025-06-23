import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Check login
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// POST /log-meal → log meals
router.post("/log-meal", isAuthenticated, async (req, res) => {
  const { day, mealType, foodItem, quantity } = req.body;
  const userId = req.session.user.id;

  try {
    const response = await axios.get("https://api.edamam.com/api/food-database/v2/parser", {
      params: {
        app_id: process.env.EDAMAM_APP_ID,
        app_key: process.env.EDAMAM_APP_KEY,
        ingr: foodItem,
      },
    });

    const nutrients = response.data.parsed[0].food.nutrients;
    const calories = (nutrients.ENERC_KCAL || 0) * quantity;
    const protein = (nutrients.PROCNT || 0) * quantity;
    const fat = (nutrients.FAT || 0) * quantity;
    const carbs = (nutrients.CHOCDF || 0) * quantity;

    await req.db.execute(
      "INSERT INTO meals (user_id, day, meal_type, food_item, quantity, calories, protein, fat, carbs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, day, mealType, foodItem, quantity, calories, protein, fat, carbs]
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Meal logging failed:", err);
    res.status(500).send("Error logging meal.");
  }
});

// GET /suggest-meal → simple meal suggestion
router.get("/suggest-meal", isAuthenticated, async (req, res) => {
  const { caloriesTarget = 500, proteinTarget = 20 } = req.query;

  const suggestions = [
    { food: "Boiled Eggs", cal: 155, protein: 13 },
    { food: "Paneer", cal: 265, protein: 18 },
    { food: "Poha", cal: 180, protein: 3 },
  ];

  const filtered = suggestions.filter(
    (item) => item.cal <= +caloriesTarget && item.protein >= +proteinTarget
  );

  res.render("suggestions.ejs", { suggestions: filtered });
});

export default router;