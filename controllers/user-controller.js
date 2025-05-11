const { prisma } = require('../prisma/prisma.client');
const bcrypt = require('bcryptjs');
const Jdenticon = require('jdenticon');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const UserController = {
  register: async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: 'Пользователь с данным email уже существует' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const png = Jdenticon.toPng(`${name}_${Date.now()}`, 200);
      const avatarName = `${name}_${Date.now()}.png`;
      const avatarPath = path.join(__dirname, '/../uploads', avatarName);
      fs.writeFileSync(avatarPath, png);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatarUrl: `/uploads/${avatarName}`,
        },
      });

      res.json(user);
    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({ error: 'Неверный логин или пароль' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Неверный логин или пароль' });
      }

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY);
      res.json({ token });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },

  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(id) }, // Преобразование в число
        include: {
          followers: true,
          following: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const isFollowing = await prisma.follows.findFirst({
        where: {
          AND: [
            { followerId: Number(userId) }, // Преобразование
            { followingId: Number(id) }, // Преобразование
          ],
        },
      });

      res.json({
        ...user,
        isFollowing: Boolean(isFollowing),
      });
    } catch (error) {
      console.error('Error in getUserById:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },

  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, name, dateOfBirth, bio, location } = req.body;
    const userId = Number(req.user.userId); // Преобразование

    let filePath;

    if (req.file && req.file.path) {
      filePath = req.file.path;
    }

    // Проверка прав
    if (Number(id) !== userId) {
      // Сравниваем числа
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    try {
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: { email: email },
        });

        if (existingUser && existingUser.id !== userId) {
          return res
            .status(400)
            .json({ error: 'Пользователь с таким email уже существует' });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId }, // Используем преобразованный ID
        data: {
          email: email || undefined,
          name: name || undefined,
          avatarUrl: filePath ? `/${filePath}` : undefined,
          dateOfBirth: dateOfBirth || undefined,
          bio: bio || undefined,
          location: location || undefined,
        },
      });
      res.json(user);
    } catch (error) {
      console.error('Error in updateUser:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },

  current: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(req.user.userId) }, // Преобразование
        include: {
          followers: {
            include: {
              follower: true,
            },
          },
          following: {
            include: {
              following: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(400).json({ error: 'Пользователь не найден' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error in current:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
};

module.exports = UserController;
