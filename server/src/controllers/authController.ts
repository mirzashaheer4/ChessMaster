import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { JWT_SECRET_SAFE } from '../config';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, and password are required' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      res.status(400).json({ error: 'User with that email or username already exists' });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash
      }
    });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET_SAFE, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, username: user.username, eloRating: user.eloRating }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET_SAFE, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, eloRating: user.eloRating }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
};

// Returns user details if they supply a valid token via auth middleware
export const getProfile = async (req: any, res: Response): Promise<void> => {
   try {
     const userId = req.user?.userId;
     if (!userId) {
       res.status(401).json({ error: 'Unauthorized' });
       return;
     }

     const user = await prisma.user.findUnique({
       where: { id: userId },
       select: { id: true, username: true, eloRating: true, createdAt: true }
     });

     if (!user) {
       res.status(404).json({ error: 'User not found' });
       return;
     }

     res.json(user);
   } catch (error) {
     console.error('Profile fetch error:', error);
     res.status(500).json({ error: 'Internal server error' });
   }
};
