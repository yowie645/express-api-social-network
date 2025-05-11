const { prisma } = require('../prisma/prisma.client');
const bcrypt = require('bcryptjs');
const Jdenticon = require('jdenticon');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const jwt = require('jsonwebtoken');

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

      // Создание папки uploads если не существует
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        await fsPromises.mkdir(uploadsDir, { recursive: true });
      }

      // Генерация и сохранение аватарки
      const avatarName = `avatar_${name}_${Date.now()}.png`;
      const avatarPath = path.join(uploadsDir, avatarName);
      const pngBuffer = Jdenticon.toPng(`${name}${Date.now()}`, 200);
      await fsPromises.writeFile(avatarPath, pngBuffer);

      // Создание пользователя
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
      res.json({ token });
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
        include: {
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
      let avatarUrl;
      const uploadsDir = path.join(__dirname, '../uploads');

      // Обработка новой аватарки
      if (req.file) {
        const avatarName = `avatar_${name}_${Date.now()}${path.extname(
          req.file.originalname
        )}`;
        const avatarPath = path.join(uploadsDir, avatarName);

        await fsPromises.writeFile(avatarPath, req.file.buffer);
        avatarUrl = `/uploads/${avatarName}`;

        // Удаление старой аватарки если она существует
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
          const oldAvatarPath = path.join(
            uploadsDir,
            user.avatarUrl.replace('/uploads/', '')
          );
          try {
            await fsPromises.unlink(oldAvatarPath);
          } catch (err) {
            console.error('Error deleting old avatar:', err);
          }
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          email: email || undefined,
          name: name || undefined,
          avatarUrl: avatarUrl || undefined,
          dateOfBirth: dateOfBirth || undefined,
          bio: bio || undefined,
          location: location || undefined,
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
