const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Sanitize username
    const sanitizedUsername = username.trim();
    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 50) {
      return res.status(400).json({ error: 'Invalid username format' });
    }

    // Get user from database
    const userQuery = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(userQuery, [sanitizedUsername]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.is_locked && user.lock_until > new Date()) {
      const minutesLeft = Math.ceil((user.lock_until - new Date()) / 60000);
      return res.status(403).json({ 
        error: `Account locked. Try again in ${minutesLeft} minute(s).` 
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      const failedAttempts = user.failed_attempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

      if (failedAttempts >= maxAttempts) {
        const lockTime = parseInt(process.env.LOCK_TIME) || 5;
        const lockUntil = new Date(Date.now() + lockTime * 60 * 1000);
        
        await pool.query(
          'UPDATE users SET failed_attempts = $1, is_locked = TRUE, lock_until = $2 WHERE id = $3',
          [failedAttempts, lockUntil, user.id]
        );
        
        return res.status(403).json({ 
          error: `Account locked for ${lockTime} minutes due to multiple failed attempts.` 
        });
      }

      await pool.query(
        'UPDATE users SET failed_attempts = $1 WHERE id = $2',
        [failedAttempts, user.id]
      );

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts and update last login
    await pool.query(
      'UPDATE users SET failed_attempts = 0, is_locked = FALSE, lock_until = NULL, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        state: user.state,
        district: user.district,
        rto_office: user.rto_office
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    // Log successful login
    console.log(`✅ User logged in: ${user.username} (${user.role})`);

    res.json({ 
      token,
      user: {
        username: user.username,
        role: user.role,
        state: user.state,
        district: user.district,
        rto_office: user.rto_office
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint (optional - mainly for logging)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;