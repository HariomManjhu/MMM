// routes/dashboard.js
import express from 'express';
const router = express.Router();

// Utility: Macro Targets
function calculateTargets(user) {
  const { weight, height, age, gender, goal } = user;
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  let calorieGoal = bmr;
  if (goal === 'bulk') calorieGoal += 300;
  else if (goal === 'cut') calorieGoal -= 300;

  const total = {
    calories: Math.round(calorieGoal),
    protein: Math.round((calorieGoal * 0.30) / 4),
    carbs: Math.round((calorieGoal * 0.45) / 4),
    fat: Math.round((calorieGoal * 0.25) / 9),
  };

  return {
    total,
    breakfast: {
      calories: Math.round(total.calories * 0.25),
      protein: Math.round(total.protein * 0.25),
      carbs: Math.round(total.carbs * 0.25),
      fat: Math.round(total.fat * 0.25),
    },
    lunch: {
      calories: Math.round(total.calories * 0.4),
      protein: Math.round(total.protein * 0.4),
      carbs: Math.round(total.carbs * 0.4),
      fat: Math.round(total.fat * 0.4),
    },
    dinner: {
      calories: Math.round(total.calories * 0.35),
      protein: Math.round(total.protein * 0.35),
      carbs: Math.round(total.carbs * 0.35),
      fat: Math.round(total.fat * 0.35),
    }
  };
}

// DASHBOARD ROUTE
router.get('/dashboard', async (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');

  try {
    const userId = req.session.user.id;

    const [[user]] = await req.db.query(
      `SELECT id, weight, height, age, gender, goal FROM users WHERE id = ?`,
      [userId]
    );

    const targets = calculateTargets(user);

    async function getMealSummary(mealType) {
      const [[result]] = await req.db.query(
        `SELECT
           SUM(calories) AS calories,
           SUM(protein) AS protein,
           SUM(carbs) AS carbs,
           SUM(fat) AS fat
         FROM meal_intake
         WHERE user_id = ? AND date = CURDATE() AND meal_type = ?`,
        [userId, mealType]
      );
      return {
        calories: result.calories || 0,
        protein: result.protein || 0,
        carbs: result.carbs || 0,
        fat: result.fat || 0
      };
    }

    const [breakfast, lunch, dinner] = await Promise.all([
      getMealSummary('breakfast'),
      getMealSummary('lunch'),
      getMealSummary('dinner')
    ]);

    res.render('dashboard', {
      session: req.session,
      targets,
      meals: { breakfast, lunch, dinner }
    });

  } catch (err) {
    console.error(' Dashboard error:', err);
    res.status(500).send('Server Error');
  }
});

// WEEKLY SUMMARY ROUTE
router.get('/weeklysummary', async (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');

  try {
    const userId = req.session.user.id;

    const [rows] = await req.db.query(
      `SELECT 
         DATE(date) AS date,
         SUM(calories) AS calories,
         SUM(protein) AS protein,
         SUM(carbs) AS carbs,
         SUM(fat) AS fat
       FROM meal_intake
       WHERE user_id = ?
         AND date >= CURDATE() - INTERVAL 6 DAY
       GROUP BY DATE(date)
       ORDER BY DATE(date) ASC`,
      [userId]
    );

    res.render('weekly_summary', {
      session: req.session,
      days: rows   //  using 'days' instead of 'summary'
    });

  } catch (err) {
    console.error(" Weekly summary error:", err);
    res.status(500).send("Server error");
  }
});


export default router;