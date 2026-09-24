const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSelect = `
  SELECT id, name, email, role, created_at, updated_at
  FROM users`;

const getUserId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const registerUser = async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name || !email || !isValidEmail(email) || password.length < 6) {
    return res.status(400).json({ error: 'Invalid registration data' });
  }

  try {
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'customer')`,
      [name, email, passwordHash]
    );
    const [users] = await pool.query(`${userSelect} WHERE id = ?`, [result.insertId]);

    res.status(201).json(users[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }

    res.status(500).json({ error: 'Failed to register user' });
  }
};

const loginUser = async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !isValidEmail(email) || !password) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  try {
    const [users] = await pool.query(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
};

const getUserInput = (body) => {
  body = body && typeof body === 'object' ? body : {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const passwordHash = typeof body.password_hash === 'string'
    ? body.password_hash.trim()
    : '';
  const role = body.role === undefined ? 'customer' : body.role;

  if (!name || !email || !isValidEmail(email) || !passwordHash) {
    return null;
  }

  if (role !== 'customer' && role !== 'admin') {
    return null;
  }

  return { name, email, passwordHash, role };
};

const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(`${userSelect} ORDER BY id`);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getUserById = async (req, res) => {
  const id = getUserId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const [users] = await pool.query(`${userSelect} WHERE id = ?`, [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const createUser = async (req, res) => {
  const user = getUserInput(req.body);

  if (!user) {
    return res.status(400).json({ error: 'Invalid user data' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [user.name, user.email, user.passwordHash, user.role]
    );
    const [users] = await pool.query(`${userSelect} WHERE id = ?`, [result.insertId]);

    res.status(201).json(users[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  const id = getUserId(req.params.id);
  const user = getUserInput(req.body);

  if (!id) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  if (!user) {
    return res.status(400).json({ error: 'Invalid user data' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE users
       SET name = ?, email = ?, password_hash = ?, role = ?
       WHERE id = ?`,
      [user.name, user.email, user.passwordHash, user.role, id]
    );

    if (result.affectedRows === 0) {
      const [existingUsers] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);

      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    const [users] = await pool.query(`${userSelect} WHERE id = ?`, [id]);
    res.status(200).json(users[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  const id = getUserId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};