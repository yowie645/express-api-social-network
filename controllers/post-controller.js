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
        orderBy: { id: 'desc' },
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
    const userId = Number(req.user.userId);

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
          },
          likes: {
            select: {
              userId: true,
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

      res.json({
        ...post,
        likedByUser: post.likes.some((like) => like.userId === userId),
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
      });
    } catch (error) {
      console.error('Post fetch error:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
  deletePost: async (req, res) => {
    const { id } = req.params;
    const postId = Number(id);
    const userId = Number(req.user.userId);

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      return res.status(404).json({ error: 'Пост не найден' });
    }

    if (post.authorId !== userId) {
      return res.status(403).json({ error: 'Нет доступа' });
    }

    try {
      const transaction = await prisma.$transaction([
        prisma.comment.deleteMany({ where: { postId: postId } }),
        prisma.like.deleteMany({ where: { postId: postId } }),
        prisma.post.delete({ where: { id: postId } }),
      ]);

      res.json(transaction);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: 'Ошибка сервера',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
};

module.exports = PostController;
