const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only admin can manage users
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can manage users' });
    }

    if (req.method === 'GET') {
      // Get all users
      const result = await pool.query(
        'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC'
      );

      return res.status(200).json({
        users: result.rows,
        total: result.rows.length
      });
    }

    if (req.method === 'POST') {
      // Create new user
      const { email, name, role, password } = req.body;

      if (!email || !name || !role || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(password, 10);

      // Create user
      const result = await pool.query(
        'INSERT INTO users (email, name, password_hash, role, is_active, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, name, role, is_active',
        [email, name, passwordHash, role, true]
      );

      return res.status(201).json({
        message: 'User created successfully',
        user: result.rows[0]
      });
    }

    if (req.method === 'PUT') {
      // Update user
      const { userId, role, is_active } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const result = await pool.query(
        'UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active) WHERE id = $3 RETURNING id, email, name, role, is_active',
        [role, is_active, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        message: 'User updated successfully',
        user: result.rows[0]
      });
    }

    if (req.method === 'DELETE') {
      // Delete user
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Prevent deleting own account
      if (userId === decoded.userId) {
        return res.status(403).json({ error: 'Cannot delete your own account' });
      }

      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        message: 'User deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('User management error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
