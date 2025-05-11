const { prisma } = require('../prisma/prisma.client');

const FollowController = {
  followUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;

    // Преобразуем ID в числа
    const numFollowingId = Number(followingId);
    const numUserId = Number(userId);

    if (numFollowingId === numUserId) {
      return res
        .status(400) // Изменил статус с 500 на 400 (Bad Request)
        .json({ error: 'Вы не можете подписаться на себя' });
    }

    try {
      const existingFollow = await prisma.follows.findFirst({
        where: {
          AND: [{ followerId: numUserId }, { followingId: numFollowingId }],
        },
      });

      if (existingFollow) {
        return res
          .status(400)
          .json({ error: 'Вы уже подписаны на этого пользователя' });
      }

      await prisma.follows.create({
        data: {
          follower: { connect: { id: numUserId } },
          following: { connect: { id: numFollowingId } },
        },
      });
      res.status(201).json({ message: 'Подписка успешно создана' });
    } catch (error) {
      console.error('Error in followUser:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  unfollowUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;

    // Преобразуем ID в числа
    const numFollowingId = Number(followingId);
    const numUserId = Number(userId);

    try {
      const follows = await prisma.follows.findFirst({
        where: {
          AND: [{ followerId: numUserId }, { followingId: numFollowingId }],
        },
      });

      if (!follows) {
        return res
          .status(404)
          .json({ error: 'Вы не подписаны на этого пользователя' });
      }

      await prisma.follows.delete({
        where: { id: follows.id },
      });

      res.status(200).json({ message: 'Подписка успешно удалена' });
    } catch (error) {
      console.error('Error in unfollowUser:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
};

module.exports = FollowController;
