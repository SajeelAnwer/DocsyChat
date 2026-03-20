const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

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

// ── DELETE /api/auth/account ──────────────────────────────────────────────
// Permanently deletes the authenticated user and all their data.
// Order: messages → threads → document_chunks → documents → verification_codes → user
const { requireAuth } = require('../middleware/auth');

router.delete('/account', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Get all thread IDs for this user
    const { data: threads } = await supabase
      .from('threads')
      .select('id')
      .eq('user_id', userId);

    const threadIds = (threads || []).map(t => t.id);

    // 2. Delete all messages in those threads
    if (threadIds.length > 0) {
      await supabase.from('messages').delete().in('thread_id', threadIds);
    }

    // 3. Delete all threads
    await supabase.from('threads').delete().eq('user_id', userId);

    // 4. Get all document IDs for this user
    const { data: docs } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', userId);

    const docIds = (docs || []).map(d => d.id);

    // 5. Delete all document chunks
    if (docIds.length > 0) {
      await supabase.from('document_chunks').delete().in('document_id', docIds);
    }

    // 6. Delete all documents
    await supabase.from('documents').delete().eq('user_id', userId);

    // 7. Delete verification codes
    await supabase.from('verification_codes').delete().eq('user_id', userId);

    // 8. Delete the user
    await supabase.from('users').delete().eq('id', userId);

    console.log(`🗑️ Account deleted: user ${userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err.message);
    res.status(500).json({ error: 'Failed to delete account. Please try again.' });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────
// Sends a 6-digit reset code to the user's email if the account exists.
// Always returns 200 to avoid leaking whether an email is registered.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, is_verified')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Always respond the same way — don't reveal if email exists
    if (!user || !user.is_verified) {
      return res.json({ success: true, message: 'If that email exists, a reset code has been sent.' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Reuse verification_codes table — upsert so only one code exists at a time
    await supabase.from('verification_codes').upsert(
      { user_id: user.id, code, expires_at: expiresAt },
      { onConflict: 'user_id' }
    );

    await sendPasswordResetEmail(email.toLowerCase().trim(), user.first_name, code);

    res.json({ success: true, userId: user.id, message: 'If that email exists, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
  }
});

// ── POST /api/auth/verify-reset-code ─────────────────────────────────────
// Verifies the 6-digit reset code without changing the password yet.
// Returns a short-lived resetToken the client uses for the final step.
router.post('/verify-reset-code', async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'User ID and code are required.' });

  try {
    const { data: record } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code.trim())
      .single();

    if (!record) return res.status(400).json({ error: 'Invalid reset code.' });
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired. Please start again.' });
    }

    // Issue a short-lived JWT scoped only for password reset
    const resetToken = jwt.sign(
      { userId, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ success: true, resetToken });
  } catch (err) {
    console.error('Verify reset code error:', err.message);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────
// Sets a new password using the resetToken from verify-reset-code.
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Verify and decode the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Reset session has expired. Please start again.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash: passwordHash }).eq('id', decoded.userId);

    // Delete the used reset code
    await supabase.from('verification_codes').delete().eq('user_id', decoded.userId);

    res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;
