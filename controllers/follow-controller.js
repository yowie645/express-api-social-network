const { prisma } = require('../prisma/prisma.client');

const FollowController = {
  followUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;

    if (!followingId || isNaN(Number(followingId))) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    if (Number(followingId) === Number(userId)) {
      return res
        .status(400)
        .json({ error: 'Вы не можете подписаться на себя' });
    }

    try {
      // проверка существование пользователя, на которого подписываемся
      const userToFollow = await prisma.user.findUnique({
        where: { id: Number(followingId) },
      });

      if (!userToFollow) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const existingFollow = await prisma.follows.findFirst({
        where: {
          followerId: Number(userId),
          followingId: Number(followingId),
        },
      });

      if (existingFollow) {
        return res.status(409).json({
          error: 'Вы уже подписаны на этого пользователя',
          followId: existingFollow.id,
        });
      }

      const newFollow = await prisma.follows.create({
        data: {
          followerId: Number(userId),
          followingId: Number(followingId),
        },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          following: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Вы успешно подписались на пользователя',
        follow: {
          id: newFollow.id,
          follower: newFollow.follower,
          following: newFollow.following,
          createdAt: newFollow.createdAt,
        },
        stats: {
          followersCount: await prisma.follows.count({
            where: { followingId: Number(followingId) },
          }),
          followingCount: await prisma.follows.count({
            where: { followerId: Number(followingId) },
          }),
        },
      });
    } catch (error) {
      console.error('Error in followUser:', error);
      res.status(500).json({
        error: 'Ошибка при подписке на пользователя',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  unfollowUser: async (req, res) => {
    const { followingId } = req.body;
    const userId = req.user.userId;

    if (!followingId || isNaN(Number(followingId))) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    try {
      const followRelation = await prisma.follows.findFirst({
        where: {
          followerId: Number(userId),
          followingId: Number(followingId),
        },
        include: {
          following: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!followRelation) {
        return res.status(404).json({
          error: 'Вы не подписаны на этого пользователя',
          userId,
          followingId,
        });
      }

      await prisma.follows.delete({
        where: { id: followRelation.id },
      });

      res.status(200).json({
        success: true,
        message: 'Вы отписались от пользователя',
        unfollowedUser: followRelation.following,
        stats: {
          followersCount: await prisma.follows.count({
            where: { followingId: Number(followingId) },
          }),
          followingCount: await prisma.follows.count({
            where: { followerId: Number(userId) },
          }),
        },
      });
    } catch (error) {
      console.error('Error in unfollowUser:', error);
      res.status(500).json({
        error: 'Ошибка при отписке от пользователя',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Новый метод для получения статуса подписки
  getFollowStatus: async (req, res) => {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.user.userId;

    if (!targetUserId || isNaN(Number(targetUserId))) {
      return res.status(400).json({ error: 'Некорректный ID пользователя' });
    }

    try {
      const isFollowing = await prisma.follows.findFirst({
        where: {
          followerId: Number(currentUserId),
          followingId: Number(targetUserId),
        },
        select: { id: true },
      });

      const [followersCount, followingCount] = await Promise.all([
        prisma.follows.count({ where: { followingId: Number(targetUserId) } }),
        prisma.follows.count({ where: { followerId: Number(targetUserId) } }),
      ]);

      res.status(200).json({
        isFollowing: Boolean(isFollowing),
        followersCount,
        followingCount,
      });
    } catch (error) {
      console.error('Error in getFollowStatus:', error);
      res.status(500).json({
        error: 'Ошибка при проверке статуса подписки',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
};

module.exports = FollowController;
