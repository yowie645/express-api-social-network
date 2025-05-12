const { prisma } = require('../prisma/prisma.client');

const CommentController = {
  async deleteComment(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;

    // Валидация ID
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: 'Неверный ID комментария',
        details: 'ID должен быть числом',
      });
    }

    const commentId = Number(id);

    try {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          post: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!comment) {
        return res.status(404).json({
          error: 'Комментарий не найден',
          details: `Комментарий с ID ${commentId} не существует`,
        });
      }

      const isCommentAuthor = comment.userId === Number(userId);
      const isPostAuthor = comment.post.userId === Number(userId);

      if (!isCommentAuthor && !isPostAuthor) {
        return res.status(403).json({
          error: 'Доступ запрещен',
          details:
            'Вы можете удалять только свои комментарии или комментарии к своим постам',
        });
      }

      await prisma.comment.delete({
        where: { id: commentId },
      });

      return res.status(200).json({
        success: true,
        message: 'Комментарий успешно удален',
        deletedId: commentId,
      });
    } catch (error) {
      console.error('DELETE COMMENT ERROR:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        commentId,
        userId,
      });

      return res.status(500).json({
        error: 'Ошибка сервера при удалении комментария',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
};

module.exports = CommentController;
