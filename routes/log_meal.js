import express from 'express';
const router = express.Router();

// 🔢 Macros per 1 serving
const foodData = {
  'Poha':   { calories: 250, protein: 4, carbs: 30, fat: 10 },
  'Upma':   { calories: 220, protein: 3, carbs: 28, fat: 8 },
  'Rice':   { calories: 130, protein: 2.5, carbs: 28, fat: 0.3 },
  'Roti':   { calories: 100, protein: 3, carbs: 20, fat: 1 }
};

// GET /logmeal page
router.get('/logmeal', (req, res) => {
  res.render('log_meal', { user: req.session.user, success: false }); // 👈 added success
});

// POST logmeal form
router.post('/logmeal', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Please log in to log a meal.');
  }

  const userId = req.session.user.id;
  const { meal, food, quantity } = req.body;
  const today = new Date().toISOString().slice(0, 10);

  const data = foodData[food] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const qty = parseFloat(quantity) || 0;

  const totalCalories = data.calories * qty;
  const totalProtein = data.protein * qty;
  const totalCarbs = data.carbs * qty;
  const totalFat = data.fat * qty;

  try {
    await req.db.query(
      `INSERT INTO meal_intake 
       (user_id, date, meal_type, food_item, quantity, calories, protein, carbs, fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, today, meal.toLowerCase(), food, qty, totalCalories, totalProtein, totalCarbs, totalFat]
    );

    res.render('log_meal', { user: req.session.user, success: true });

  } catch (err) {
    console.error(' Error logging meal:', err);
    res.status(500).send(' Server error');
  }
});

export default router;
