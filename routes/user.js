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
router.get("/register", (req, res) => {
  res.render("register", { error: null, data: {} });
});

export default router;
