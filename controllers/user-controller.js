const { prisma } = require('../prisma/prisma.client');
const bcrypt = require('bcryptjs');
const Jdenticon = require('jdenticon');
const jwt = require('jsonwebtoken');

// Константы для оптимизации Base64
const AVATAR_SIZE = 200; // Размер аватарки в пикселях
const BASE64_PREFIX = 'data:image/png;base64,';

const UserController = {
  register: async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    try {
      // Проверка существующего пользователя
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res
          .status(400)
          .json({ error: 'Пользователь с данным email уже существует' });
      }

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, 10);

      // Генерация аватарки в Base64
      const pngBuffer = Jdenticon.toPng(`${name}${Date.now()}`, AVATAR_SIZE);
      const avatarBase64 = BASE64_PREFIX + pngBuffer.toString('base64');

      // Создание пользователя
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatarUrl: avatarBase64,
        },
      });

      // Не возвращаем пароль в ответе
      const { password: _, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
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

      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY, {
        expiresIn: '30d',
      });

      // Не возвращаем пароль в ответе
      const { password: _, ...userData } = user;
      res.json({ ...userData, token });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },

  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = Number(req.user.userId);

    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          location: true,
          dateOfBirth: true,
          followers: true,
          following: true,
          posts: {
            orderBy: { createdAt: 'desc' },
            include: {
              likes: true,
              comments: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const isFollowing = await prisma.follows.findFirst({
        where: {
          AND: [{ followerId: userId }, { followingId: Number(id) }],
        },
      });

      res.json({
        ...user,
        isFollowing: Boolean(isFollowing),
        posts: user.posts.map((post) => ({
          ...post,
          likedByUser: post.likes.some((like) => like.userId === userId),
          likesCount: post.likes.length,
          commentsCount: post.comments.length,
        })),
      });
    } catch (error) {
      console.error('Error in getUserById:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },

  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, name, dateOfBirth, bio, location } = req.body;
    const userId = Number(req.user.userId);

    if (Number(id) !== userId) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    try {
      let avatarBase64;

      // Если загружен новый файл аватарки
      if (req.file) {
        const pngBuffer = req.file.buffer;
        avatarBase64 = BASE64_PREFIX + pngBuffer.toString('base64');
      }

      const updateData = {
        email: email || undefined,
        name: name || undefined,
        dateOfBirth: dateOfBirth || undefined,
        bio: bio || undefined,
        location: location || undefined,
        ...(avatarBase64 && { avatarUrl: avatarBase64 }),
      };

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          location: true,
          dateOfBirth: true,
        },
      });

      res.json(user);
    } catch (error) {
      console.error('Error in updateUser:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },

  current: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(req.user.userId) },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          location: true,
          dateOfBirth: true,
          followers: {
            include: {
              follower: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
          following: {
            include: {
              following: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
          posts: {
            orderBy: { createdAt: 'desc' },
            include: {
              likes: true,
              comments: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      res.json({
        ...user,
        posts: user.posts.map((post) => ({
          ...post,
          likedByUser: post.likes.some(
            (like) => like.userId === Number(req.user.userId)
          ),
          likesCount: post.likes.length,
          commentsCount: post.comments.length,
        })),
      });
    } catch (error) {
      console.error('Error in current:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },
};

module.exports = UserController;
