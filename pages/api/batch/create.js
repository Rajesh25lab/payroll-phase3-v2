const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { name, month, year, totalEmployees, totalAmount } = req.body;

    if (!name || !month || !year || totalEmployees === undefined || totalAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user has permission
    if (decoded.role !== 'admin' && decoded.role !== 'accountant') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Create batch in database
    const result = await pool.query(
      'INSERT INTO batches (name, month, year, total_employees, total_amount, created_by, created_at, status) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING id, name, month, year, total_employees, total_amount',
      [name, month, year, totalEmployees, totalAmount, decoded.userId, 'active']
    );

    const batch = result.rows[0];

    return res.status(201).json({
      id: batch.id,
      name: batch.name,
      month: batch.month,
      year: batch.year,
      totalEmployees: batch.total_employees,
      totalAmount: batch.total_amount,
      message: 'Batch created successfully'
    });
  } catch (error) {
    console.error('Batch creation error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
