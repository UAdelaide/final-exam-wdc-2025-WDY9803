const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await db.query(`
      SELECT user_id, username, password_hash, role FROM Users WHERE username = ?
    `, [username]);

    const user = users[0];

    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      role: user.role
    };

    let redirectUrl = '';

    if (user.role === 'owner') {
      redirectUrl = '/owner-dashboard.html';
    } else if (user.role === 'walker') {
      redirectUrl = '/walker-dashboard.html';
    } else {
      redirectUrl = '/';
    }

    res.json({ message: 'Login successful', redirect: redirectUrl });

  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

router.get('/dogs-list', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ownerId = req.session.user.user_id;

  try {
    const [rows] = await db.query(`
      SELECT DISTINCT dog_id, name FROM Dogs
    `, [ownerId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

router.get('/dogs', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dog_id, name, size, owner_id FROM Dogs
    `);
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch dogs:', error);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

module.exports = router;