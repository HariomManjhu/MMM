import express from 'express';
const router = express.Router();

// GET: Render Change Goal Page
router.get('/change-goal', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('change_goal', { user: req.session.user });
});

// POST: Handle form submission and update DB
router.post('/update-goal', async (req, res) => {
  const { goal } = req.body;
  const userId = req.session.user?.id;

  if (!userId) return res.status(401).send("Not logged in");

  try {
    await req.db.execute(
      "UPDATE users SET goal = ? WHERE id = ?",
      [goal, userId]
    );
    req.session.user.goal = goal; // Update session
    res.redirect('/dashboard'); // or homepage
  } catch (err) {
    console.error(" Goal update error:", err);
    res.status(500).send("Failed to update goal.");
  }
});

// GET: User Profile Page
router.get('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  try {
    const userId = req.session.user.id;
    
    // Fetch user info
    const [[user]] = await req.db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    
    // Fetch enrolled mess name
    let enrolledMess = 'Not Enrolled';
    if(user.mess_id) {
        const [[mess]] = await req.db.execute('SELECT mess_name FROM mess WHERE mess_id = ?', [user.mess_id]);
        if(mess) enrolledMess = mess.mess_name;
    }

    // Fetch meal history (e.g., last 5 meals)
    const [mealHistory] = await req.db.execute(
      'SELECT food_item, calories, date FROM meal_intake WHERE user_id = ? ORDER BY date DESC LIMIT 5',
      [userId]
    );

    res.render('profile', { user, enrolledMess, mealHistory });
  } catch(err) {
    console.error("Profile page error:", err);
    res.status(500).send("Could not load profile.");
  }
});

// GET: Meal History Page
router.get('/meal-history', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  try {
    const userId = req.session.user.id;
    const { meal_type, date } = req.query;

    let query = 'SELECT * FROM meal_intake WHERE user_id = ?';
    const params = [userId];

    if (meal_type) {
      query += ' AND meal_type = ?';
      params.push(meal_type);
    }

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date DESC';

    const [mealHistory] = await req.db.execute(query, params);
    
    res.render('meal_history', { mealHistory, filters: req.query });
  } catch(err) {
    console.error("Meal history error:", err);
    res.status(500).send("Could not load meal history.");
  }
});

// GET: Analytics Page
router.get('/analytics', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  try {
    const userId = req.session.user.id;

    // 1. Fetch user's physical data and goal
    const [[user]] = await req.db.execute(
      'SELECT weight, height, age, gender, goal FROM users WHERE id = ?',
      [userId]
    );

    // 2. Calculate BMR (Mifflin-St Jeor)
    let bmr;
    if (user.gender.toLowerCase() === 'male') {
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
    } else {
      bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
    }
    
    // 3. Calculate TDEE (assuming light activity)
    const tdee = bmr * 1.375;

    // 4. Calculate Target Calories based on goal
    let targetCalories;
    if (user.goal === 'cut') targetCalories = tdee - 400;
    else if (user.goal === 'bulk') targetCalories = tdee + 400;
    else targetCalories = tdee;

    // 5. Calculate Target Macros (40% C, 30% P, 30% F)
    const targetProtein = (targetCalories * 0.30) / 4;
    const targetCarbs = (targetCalories * 0.40) / 4;
    const targetFat = (targetCalories * 0.30) / 9;

    const targets = {
      calories: targetCalories.toFixed(0),
      protein: targetProtein.toFixed(0),
      carbs: targetCarbs.toFixed(0),
      fat: targetFat.toFixed(0),
    };

    // 6. Fetch actual intake data for weekly chart (last 7 days)
    const [weeklyRows] = await req.db.execute(
      `SELECT date, SUM(calories) as total_calories, SUM(protein) as total_protein, SUM(carbs) as total_carbs, SUM(fat) as total_fat 
       FROM meal_intake 
       WHERE user_id = ? AND date >= CURDATE() - INTERVAL 7 DAY 
       GROUP BY date 
       ORDER BY date ASC`,
      [userId]
    );

    // 7. Fetch data for monthly summary (last 30 days)
    const [monthlyRows] = await req.db.execute(
      `SELECT date, SUM(calories) as total_calories, SUM(protein) as total_protein, SUM(carbs) as total_carbs, SUM(fat) as total_fat 
       FROM meal_intake 
       WHERE user_id = ? AND date >= CURDATE() - INTERVAL 30 DAY 
       GROUP BY date`,
      [userId]
    );
    
    // 8. Calculate monthly summary stats
    const monthlySummary = {
      calories: { good: 0 },
      protein: { good: 0 },
      carbs: { good: 0 },
      fat: { good: 0 },
      totalDays: monthlyRows.length
    };

    monthlyRows.forEach(day => {
      if (user.goal === 'cut' && day.total_calories <= targets.calories) monthlySummary.calories.good++;
      if (user.goal === 'bulk' && day.total_calories >= targets.calories) monthlySummary.calories.good++;
      if (user.goal === 'maintain' && Math.abs(day.total_calories - targets.calories) < 100) monthlySummary.calories.good++;
      
      if (day.total_protein >= targets.protein) monthlySummary.protein.good++;
      if (day.total_carbs <= targets.carbs) monthlySummary.carbs.good++;
      if (day.total_fat <= targets.fat) monthlySummary.fat.good++;
    });

    const labels = weeklyRows.map(r => new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }));
    const actuals = {
      calories: weeklyRows.map(r => r.total_calories),
      protein: weeklyRows.map(r => r.total_protein),
      carbs: weeklyRows.map(r => r.total_carbs),
      fat: weeklyRows.map(r => r.total_fat),
    };

    // 9. Fetch data for week-over-week comparison
    const [lastWeekRows] = await req.db.execute(
      `SELECT AVG(calories) as c, AVG(protein) as p, AVG(carbs) as ca, AVG(fat) as f 
       FROM meal_intake 
       WHERE user_id = ? AND date BETWEEN CURDATE() - INTERVAL 14 DAY AND CURDATE() - INTERVAL 8 DAY`,
      [userId]
    );
    const [thisWeekRows] = await req.db.execute(
      `SELECT AVG(calories) as c, AVG(protein) as p, AVG(carbs) as ca, AVG(fat) as f 
       FROM meal_intake 
       WHERE user_id = ? AND date >= CURDATE() - INTERVAL 7 DAY`,
      [userId]
    );

    const calcChange = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return (((current - previous) / previous) * 100).toFixed(0);
    };

    const weeklyComparison = {
      calories: calcChange(thisWeekRows[0].c, lastWeekRows[0].c),
      protein: calcChange(thisWeekRows[0].p, lastWeekRows[0].p),
      carbs: calcChange(thisWeekRows[0].ca, lastWeekRows[0].ca),
      fat: calcChange(thisWeekRows[0].f, lastWeekRows[0].f),
    };

    res.render('analytics', { 
      chartData: JSON.stringify({ labels, actuals, targets, goal: user.goal }),
      monthlySummary,
      weeklyComparison
    });
  } catch(err) {
    console.error("Analytics page error:", err);
    res.status(500).send("Could not load analytics.");
  }
});

// GET: Leaderboard page
router.get('/leaderboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const currentUserId = req.session.user.id;

  try {
    // 1. Get all students
    const [students] = await req.db.execute("SELECT id, weight, height, age, gender, goal FROM users WHERE role = 'student'");

    // 2. Calculate and update score for each student
    for (const student of students) {
      let bmr = (10 * student.weight) + (6.25 * student.height) - (5 * student.age);
      bmr += (student.gender.toLowerCase() === 'male') ? 5 : -161;
      const tdee = bmr * 1.375;

      let targetCalories;
      if (student.goal === 'cut') targetCalories = tdee - 400;
      else if (student.goal === 'bulk') targetCalories = tdee + 400;
      else targetCalories = tdee;

      const targets = {
        calories: targetCalories,
        protein: (targetCalories * 0.30) / 4,
        carbs: (targetCalories * 0.40) / 4,
        fat: (targetCalories * 0.30) / 9,
      };

      const [monthlyRows] = await req.db.execute(
        `SELECT SUM(calories) as c, SUM(protein) as p, SUM(carbs) as ca, SUM(fat) as f FROM meal_intake WHERE user_id = ? AND date >= CURDATE() - INTERVAL 30 DAY GROUP BY date`,
        [student.id]
      );
      
      let score = 0;
      monthlyRows.forEach(day => {
        if (student.goal === 'cut' && day.c <= targets.calories) score++;
        if (student.goal === 'bulk' && day.c >= targets.calories) score++;
        if (student.goal === 'maintain' && Math.abs(day.c - targets.calories) < 100) score++;
        if (day.p >= targets.protein) score++;
        if (day.ca <= targets.carbs) score++;
        if (day.f <= targets.fat) score++;
      });

      await req.db.execute("UPDATE users SET score = ? WHERE id = ?", [score, student.id]);
    }

    // 3. Fetch top 10 users
    const [topUsers] = await req.db.execute(
      "SELECT first_name, last_name, score FROM users WHERE role = 'student' ORDER BY score DESC LIMIT 10"
    );

    // 4. Get current user's rank
    const [[currentUser]] = await req.db.execute(
      "SELECT score, (SELECT COUNT(*) + 1 FROM users WHERE score > u.score AND role = 'student') as user_rank FROM users u WHERE id = ?",
      [currentUserId]
    );

    res.render('leaderboard', { topUsers, currentUser });

  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).send("Could not load leaderboard.");
  }
});


router.get("/register", (req, res) => {
  res.render("register", { error: null, data: {} });
});

export default router;
