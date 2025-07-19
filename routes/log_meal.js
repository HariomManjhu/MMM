import express from 'express';
const router = express.Router();

// 🔢 Macros per 1 serving
const foodData = {
  'Poha':   { calories: 250, protein: 4, carbs: 30, fat: 10 },
  'Upma':   { calories: 220, protein: 3, carbs: 28, fat: 8 },
  'Rice':   { calories: 130, protein: 2.5, carbs: 28, fat: 0.3 },
  'Roti':   { calories: 100, protein: 3, carbs: 20, fat: 1 }
};

// Helper: Get user's enrolled mess
async function getUserMessId(db, userId) {
  const [rows] = await db.execute('SELECT mess_id FROM users WHERE id = ?', [userId]);
  return rows.length > 0 ? rows[0].mess_id : null;
}

// Helper to render log_meal with all expected variables
function renderLogMeal(res, options = {}) {
  res.render('log_meal', {
    user: options.user || null,
    success: options.success || false,
    notStudent: options.notStudent || false,
    notEnrolled: options.notEnrolled || false,
    enrolled: options.enrolled || false,
    messes: options.messes || [],
    menu: options.menu || [],
    dayOfWeek: options.dayOfWeek || '',
    changeMess: typeof options.changeMess !== 'undefined' ? options.changeMess : false,
    ...options
  });
}

// GET /logmeal page
router.get('/logmeal', async (req, res) => {
  if (!req.session.user) {
    return renderLogMeal(res, { user: null });
  }
  const userId = req.session.user.id;
  const [[user]] = await req.db.execute('SELECT role, mess_id FROM users WHERE id = ?', [userId]);

  if (user.role !== 'student') {
    return renderLogMeal(res, { user: req.session.user, notStudent: true });
  }

  if (!user.mess_id) {
    const [messes] = await req.db.execute('SELECT mess_id, mess_name FROM mess');
    return renderLogMeal(res, { user: req.session.user, messes, notEnrolled: true });
  }
  
  // Handle "Change Mess" button click
  if (req.query.changeMess === 'true') {
    const [messes] = await req.db.execute('SELECT mess_id, mess_name FROM mess');
    return renderLogMeal(res, { user: req.session.user, enrolled: true, messes, changeMess: true });
  }

  const today = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayOfWeek = days[today.getDay()];
  
  const [menu] = await req.db.execute(
    'SELECT * FROM mess_menu_item WHERE mess_id = ? AND day_of_week = ?',
    [user.mess_id, dayOfWeek]
  );
  
  renderLogMeal(res, { 
    user: req.session.user, 
    success: req.query.success || false, 
    menu, 
    enrolled: true, 
    dayOfWeek 
  });
});

// POST: Enroll in mess
router.post('/enroll-mess', async (req, res) => {
  if (!req.session.user) {
    return renderLogMeal(res, { user: null, notStudent: false, notEnrolled: false, enrolled: false });
  }
  const userId = req.session.user.id;
  const { mess_id } = req.body;
  await req.db.execute('UPDATE users SET mess_id = ? WHERE id = ?', [mess_id, userId]);
  res.redirect('/logmeal');
});

// POST logmeal form (for enrolled students)
router.post('/logmeal', async (req, res) => {
  if (!req.session.user) {
    return renderLogMeal(res, { user: null, notStudent: false, notEnrolled: false, enrolled: false });
  }
  const userId = req.session.user.id;
  const [[user]] = await req.db.execute('SELECT mess_id FROM users WHERE id = ?', [userId]);
  if (!user.mess_id) {
    return renderLogMeal(res, { user: req.session.user, notStudent: false, notEnrolled: true, enrolled: false });
  }
  const { menu_item_id, quantity } = req.body;
  // Get menu item details
  const [[menuItem]] = await req.db.execute('SELECT * FROM mess_menu_item WHERE menu_item_id = ?', [menu_item_id]);
  if (!menuItem) {
    return renderLogMeal(res, { user: req.session.user, notStudent: false, notEnrolled: false, enrolled: true, menu: [], dayOfWeek: '', success: false });
  }
  // Calculate macros based on quantity
  const qty = parseFloat(quantity) || 1;
  const totalCalories = (menuItem.calories || 0) * qty;
  const totalProtein = (menuItem.protein || 0) * qty;
  const totalCarbs = (menuItem.carbs || 0) * qty;
  const totalFat = (menuItem.fat || 0) * qty;
  await req.db.execute(
    `INSERT INTO meal_intake (user_id, date, meal_type, food_item, quantity, calories, protein, carbs, fat, mess_id)
     VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [userId, menuItem.meal_time, menuItem.food_name, qty, totalCalories, totalProtein, totalCarbs, totalFat, user.mess_id]
  );
  res.redirect('/logmeal?toast=Meal+logged+successfully!');
});

// This route is now handled by the main GET /logmeal route
router.get('/change-mess', (req, res) => {
    res.redirect('/logmeal?changeMess=true');
});

// POST: Change Mess
router.post('/change-mess', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const userId = req.session.user.id;
  const { mess_id } = req.body;
  await req.db.execute('UPDATE users SET mess_id = ? WHERE id = ?', [mess_id, userId]);
  res.redirect('/logmeal?toast=Mess+changed+successfully!');
});

export default router;
