const { prisma } = require('../prisma/prisma.client');

const PostController = {
  createPost: async (req, res) => {
    const { content } = req.body;

    const authorId = req.user.userId;

    if (!content) {
      return res.status(400).json({ error: 'Каждое поле обязательно' });
    }

    try {
      const post = await prisma.post.create({
        data: {
          content,
          authorId,
        },
      });

      res.json(post);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
  getAllPosts: async (req, res) => {
    const userId = req.user.userId;

    try {
      const posts = await prisma.post.findMany({
        include: {
          likes: true,
          author: true,
          comments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const postWithLikeInfo = posts.map((post) => ({
        ...post,
        likedByUser: post.likes.some((like) => like.userId === userId),
      }));

      res.json(postWithLikeInfo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
  getPostById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const post = await prisma.post.findUnique({
        where: { id: Number(id) },
        include: {
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
      });

      if (!post) {
        return res.status(404).json({ error: 'Пост не найден' });
      }

      const postWithLikeInfo = {
        ...post,
        likedByUser: post.likes.some((like) => like.userId === userId),
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
      };

      res.json(postWithLikeInfo);
    } catch (error) {
      console.error('Error in getPostById:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  deletePost: async (req, res) => {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
    });
    if (!post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    if (post.authorId !== req.user.userId) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    try {
      const transaction = await prisma.$transaction([
        prisma.comment.deleteMany({ where: { postId: id } }),
        prisma.like.deleteMany({ where: { postId: id } }),
        prisma.post.delete({ where: { id } }),
      ]);

      res.json(transaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
};

module.exports = PostController;
