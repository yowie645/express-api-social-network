const { prisma } = require('../prisma/prisma.client');
const bcrypt = require('bcryptjs');
const Jdenticon = require('jdenticon');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Настройка S3 клиента для Yandex Cloud
const s3 = new AWS.S3({
  endpoint: 'https://storage.yandexcloud.net',
  accessKeyId: process.env.YC_ACCESS_KEY_ID,
  secretAccessKey: process.env.YC_SECRET_ACCESS_KEY,
  region: process.env.YC_REGION || 'ru-central1',
});

const UserController = {
  register: async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Все поля обязательны',
        details: {
          email: !email,
          password: !password,
          name: !name,
        },
      });
    }

    try {
      // Проверка существующего пользователя
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return res.status(400).json({
          error: 'Пользователь с данным email уже существует',
          suggestion: 'Используйте другой email или войдите в систему',
        });
      }

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, 10);

      // Генерация аватарки
      const pngBuffer = Jdenticon.toPng(`${name}${Date.now()}`, 200);
      const avatarKey = `avatars/${uuidv4()}.png`;

      // Загрузка в Yandex Object Storage
      const uploadResult = await s3
        .upload({
          Bucket: process.env.YC_BUCKET_NAME,
          Key: avatarKey,
          Body: pngBuffer,
          ContentType: 'image/png',
          ACL: 'public-read',
        })
        .promise();

      // Создание пользователя
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatarUrl: uploadResult.Location,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      res.status(201).json(user);
    } catch (error) {
      console.error('Registration Error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: 'Ошибка при регистрации',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Все поля обязательны',
        missing: {
          email: !email,
          password: !password,
        },
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          error: 'Неверные учетные данные',
          suggestion: 'Проверьте email и пароль',
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({
          error: 'Неверные учетные данные',
          suggestion: 'Проверьте пароль',
        });
      }

      // Генерация JWT токена
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
        },
        process.env.SECRET_KEY,
        { expiresIn: '30d' }
      );

      // Формируем ответ без пароля
      const { password: _, ...userData } = user;
      res.json({
        ...userData,
        token,
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.status(500).json({
        error: 'Ошибка входа',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },

  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

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
          followers: {
            select: {
              id: true,
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
            select: {
              id: true,
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
            select: {
              id: true,
              content: true,
              createdAt: true,
              likes: {
                select: {
                  userId: true,
                },
              },
              comments: {
                select: {
                  id: true,
                },
              },
              author: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'Пользователь не найден',
          suggestion: 'Проверьте ID пользователя',
        });
      }

      // Проверка подписки
      const isFollowing = userId
        ? await prisma.follows.findFirst({
            where: {
              followerId: Number(userId),
              followingId: Number(id),
            },
            select: { id: true },
          })
        : false;

      // Форматирование постов
      const formattedPosts = user.posts.map((post) => ({
        ...post,
        likedByUser: userId
          ? post.likes.some((like) => like.userId === Number(userId))
          : false,
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
      }));

      res.json({
        ...user,
        isFollowing: Boolean(isFollowing),
        posts: formattedPosts,
      });
    } catch (error) {
      console.error('Get User Error:', error);
      res.status(500).json({
        error: 'Ошибка получения данных',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },

  updateUser: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { email, name, dateOfBirth, bio, location } = req.body;

    if (Number(id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Доступ запрещен',
        details: 'Вы можете редактировать только свой профиль',
      });
    }

    try {
      let avatarUrl;
      let oldAvatarKey;

      // Если загружен новый файл аватарки
      if (req.file) {
        // Получаем текущего пользователя
        const currentUser = await prisma.user.findUnique({
          where: { id: Number(userId) },
          select: { avatarUrl: true },
        });

        // Удаляем старую аватарку из S3
        if (currentUser?.avatarUrl) {
          try {
            const url = new URL(currentUser.avatarUrl);
            oldAvatarKey = url.pathname.substring(1); // Удаляем первый слэш
            await s3
              .deleteObject({
                Bucket: process.env.YC_BUCKET_NAME,
                Key: oldAvatarKey,
              })
              .promise();
          } catch (error) {
            console.error('Error deleting old avatar:', error);
          }
        }

        // Загружаем новую аватарку
        const avatarKey = `avatars/${uuidv4()}${path.extname(
          req.file.originalname
        )}`;
        const uploadResult = await s3
          .upload({
            Bucket: process.env.YC_BUCKET_NAME,
            Key: avatarKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read',
          })
          .promise();

        avatarUrl = uploadResult.Location;
      }

      // Обновление данных пользователя
      const updatedUser = await prisma.user.update({
        where: { id: Number(userId) },
        data: {
          email: email || undefined,
          name: name || undefined,
          avatarUrl: avatarUrl || undefined,
          dateOfBirth: dateOfBirth || undefined,
          bio: bio || undefined,
          location: location || undefined,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          bio: true,
          location: true,
          dateOfBirth: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Update User Error:', error);
      res.status(500).json({
        error: 'Ошибка обновления данных',
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
          email: true,
          name: true,
          avatarUrl: true,
          bio: true,
          location: true,
          dateOfBirth: true,
          createdAt: true,
          followers: {
            select: {
              id: true,
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
            select: {
              id: true,
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
            select: {
              id: true,
              content: true,
              createdAt: true,
              likes: {
                select: {
                  userId: true,
                },
              },
              comments: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'Пользователь не найден',
          details: 'Токен валиден, но пользователь не существует',
        });
      }

      // Форматирование постов
      const formattedPosts = user.posts.map((post) => ({
        ...post,
        likedByUser: post.likes.some(
          (like) => like.userId === Number(req.user.userId)
        ),
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
      }));

      res.json({
        ...user,
        posts: formattedPosts,
      });
    } catch (error) {
      console.error('Current User Error:', error);
      res.status(500).json({
        error: 'Ошибка получения данных',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },
};

module.exports = UserController;
