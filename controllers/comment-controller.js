const { prisma } = require('../prisma/prisma.client');

const CommentController = {
  createComment: async (req, res) => {
    const { postId, content } = req.body;
    const userId = req.user.userId;

    if (!postId || !content) {
      return res.status(400).json({
        error: 'Все поля обязательны',
        details: {
          missing: {
            postId: !postId,
            content: !content,
          },
        },
      });
    }

    try {
      // Проверяем существование поста
      const postExists = await prisma.post.findUnique({
        where: { id: Number(postId) },
        select: { id: true },
      });

      if (!postExists) {
        return res.status(404).json({
          error: 'Пост не найден',
          suggestion: 'Проверьте ID поста',
        });
      }

      // Создаем комментарий
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

      res.status(201).json(comment);
    } catch (error) {
      console.error('Create Comment Error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userId,
        postId,
      });

      res.status(500).json({
        error: 'Ошибка при создании комментария',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },

  deleteComment: async (req, res) => {
    const { id } = req.params;
    const userId = Number(req.user.userId);

    try {
      // Находим комментарий с информацией о посте и авторе
      const comment = await prisma.comment.findUnique({
        where: { id: Number(id) },
        include: {
          post: {
            select: {
              userId: true,
            },
          },
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!comment) {
        return res.status(404).json({
          error: 'Комментарий не найден',
          suggestion: 'Проверьте ID комментария',
        });
      }

      // Проверяем права: автор комментария или автор поста
      const isCommentAuthor = comment.user.id === userId;
      const isPostAuthor = comment.post.userId === userId;

      if (!isCommentAuthor && !isPostAuthor) {
        return res.status(403).json({
          error: 'Недостаточно прав для удаления',
          details:
            'Вы можете удалять только свои комментарии или комментарии к своим постам',
        });
      }

      // Удаляем комментарий
      await prisma.comment.delete({
        where: { id: Number(id) },
      });

      res.json({
        success: true,
        message: 'Комментарий успешно удален',
        deletedCommentId: id,
      });
    } catch (error) {
      console.error('Delete Comment Error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userId,
        commentId: id,
      });

      res.status(500).json({
        error: 'Ошибка при удалении комментария',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      });
    }
  },
};

module.exports = CommentController;
