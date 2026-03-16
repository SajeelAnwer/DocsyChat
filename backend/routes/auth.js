const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const { sendVerificationEmail } = require('../utils/email');

const router = express.Router();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function userResponse(user, token) {
  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`
    }
  };
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { email, password, firstName, lastName } = req.body;

  try {
    const { data: existing } = await supabase
      .from('users').select('id, is_verified').eq('email', email).single();

    if (existing) {
      if (existing.is_verified) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('verification_codes').upsert(
        { user_id: existing.id, code, expires_at: expiresAt },
        { onConflict: 'user_id' }
      );
      await sendVerificationEmail(email, firstName, code);
      return res.json({ success: true, userId: existing.id, message: 'Verification code resent.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({ email, password_hash: passwordHash, first_name: firstName, last_name: lastName, is_verified: false })
      .select('id').single();

    if (createError) throw createError;

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from('verification_codes').insert({ user_id: user.id, code, expires_at: expiresAt });
    await sendVerificationEmail(email, firstName, code);

    res.json({ success: true, userId: user.id, message: 'Account created! Check your email for the 6-digit verification code.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// ── POST /api/auth/verify ─────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'User ID and code are required.' });

  try {
    const { data: record, error } = await supabase
      .from('verification_codes').select('*').eq('user_id', userId).eq('code', code.trim()).single();

    if (error || !record) return res.status(400).json({ error: 'Invalid verification code.' });
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please sign up again.' });
    }

    await supabase.from('users').update({ is_verified: true }).eq('id', userId);
    await supabase.from('verification_codes').delete().eq('user_id', userId);

    const { data: user } = await supabase
      .from('users').select('id, email, first_name, last_name').eq('id', userId).single();

    res.json(userResponse(user, signToken(user)));
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── POST /api/auth/resend ─────────────────────────────────────────────────
router.post('/resend', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID required.' });

  try {
    const { data: user } = await supabase
      .from('users').select('id, email, first_name, is_verified').eq('id', userId).single();

    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.is_verified) return res.status(400).json({ error: 'Email already verified.' });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from('verification_codes').upsert(
      { user_id: userId, code, expires_at: expiresAt },
      { onConflict: 'user_id' }
    );
    await sendVerificationEmail(user.email, user.first_name, code);
    res.json({ success: true, message: 'New code sent.' });
  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ error: 'Failed to resend code.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid email or password.' });

  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users').select('id, email, first_name, last_name, password_hash, is_verified').eq('email', email).single();

    if (error || !user) return res.status(401).json({ error: 'Invalid email or password.' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email not verified.', needsVerification: true, userId: user.id });
    }

    res.json(userResponse(user, signToken(user)));
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
// Validates token locally — no DB call needed.
// Returns user info stored in the JWT claims.
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      user: {
        id: decoded.userId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        fullName: `${decoded.firstName} ${decoded.lastName}`
      }
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
