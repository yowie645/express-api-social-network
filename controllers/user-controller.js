const { prisma } = require('../prisma/prisma.client');
const bcrypt = require('bcryptjs');
const Jdenticon = require('jdenticon');
const jwt = require('jsonwebtoken');
const { Buffer } = require('buffer');

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

      // Генерация SVG аватарки
      const svgString = Jdenticon.toSvg(name + Date.now(), 200, {
        backColor: '#FFFFFF',
        saturation: 0.7,
      });

      const base64Avatar = Buffer.from(svgString).toString('base64');
      const avatarUrl = `data:image/svg+xml;base64,${base64Avatar}`;

      // Создание пользователя
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatarUrl,
        },
      });

      // Формируем ответ без пароля
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      };

      res.status(201).json(userResponse);
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
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }

      // Генерация JWT токена
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.SECRET_KEY,
        { expiresIn: '30d' }
      );

      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        token,
      };

      res.json(userResponse);
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
    const userId = req.user.userId;

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
          createdAt: true,
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
          followerId: Number(userId),
          followingId: Number(id),
        },
      });

      const formattedPosts = user.posts.map((post) => ({
        ...post,
        likedByUser: post.likes.some((like) => like.userId === Number(userId)),
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
      }));

      // Формируем ответ
      const response = {
        ...user,
        isFollowing: Boolean(isFollowing),
        posts: formattedPosts,
      };

      res.json(response);
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
    const userId = req.user.userId;

    if (Number(id) !== Number(userId)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    try {
      let updateData = {
        email: email || undefined,
        name: name || undefined,
        dateOfBirth: dateOfBirth || undefined,
        bio: bio || undefined,
        location: location || undefined,
      };

      // Если есть новый файл аватарки
      if (req.file) {
        const svgString = Jdenticon.toSvg(name + Date.now(), 200);
        const base64Avatar = Buffer.from(svgString).toString('base64');
        updateData.avatarUrl = `data:image/svg+xml;base64,${base64Avatar}`;
      }

      const updatedUser = await prisma.user.update({
        where: { id: Number(id) },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          location: true,
          dateOfBirth: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
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
          createdAt: true,
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

      // Форматируем ответ
      const response = {
        ...user,
        posts: user.posts.map((post) => ({
          ...post,
          likedByUser: post.likes.some(
            (like) => like.userId === Number(req.user.userId)
          ),
          likesCount: post.likes.length,
          commentsCount: post.comments.length,
        })),
      };

      res.json(response);
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
