// CommentController.js
const { prisma } = require('../prisma/prisma.client');

const CommentController = {
  createComment: async (req, res) => {
    const { postId, content } = req.body;
    const userId = req.user.userId;

    if (!postId || !content) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    try {
      const post = await prisma.post.findUnique({
        where: { id: Number(postId) },
      });

      if (!post) {
        return res.status(404).json({ error: 'Пост не найден' });
      }

      const comment = await prisma.comment.create({
        data: {
          postId: Number(postId),
          userId: Number(userId),
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      res.json(comment);
    } catch (error) {
      console.error('Error in createComment:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  deleteComment: async (req, res) => {
    const { id } = req.params;
    const userId = Number(req.user.userId);

    try {
      const comment = await prisma.comment.findUnique({
        where: { id: Number(id) },
      });

      if (!comment) {
        return res.status(404).json({ error: 'Комментарий не найден' });
      }

      if (comment.userId !== userId) {
        return res.status(403).json({
          error: 'Нет прав для удаления этого комментария',
        });
      }

      await prisma.comment.delete({
        where: { id: Number(id) },
      });

      res.json(comment);
    } catch (error) {
      console.error('Error in deleteComment:', error);
      res.status(500).json({
        error: 'Ошибка сервера',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
};

module.exports = CommentController;
