import { getAllUsers, createUser } from '../services/user.service.js';

export const getUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error', message: err.message });
  }
};

export const createUserController = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await createUser({ name, email });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error', message: err.message });
  }
};
