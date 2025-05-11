const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  UserController,
  PostController,
  CommentController,
  LikeController,
  FollowController,
} = require('../controllers');
const { authenticateToken } = require('../middleware/auth');

// Конфигурация Multer
const uploadDestination = 'uploads';

// Создаем папку для загрузок, если её нет
const fs = require('fs');
if (!fs.existsSync(uploadDestination)) {
  fs.mkdirSync(uploadDestination, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDestination,
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

// Фильтр для проверки типа файла (только изображения)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const uploads = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Маршруты аутентификации
router.post('/auth/register', UserController.register);
router.post('/auth/login', UserController.login);

// Маршруты пользователей
router.get('/users/current', authenticateToken, UserController.current);
router.get('/users/:id', authenticateToken, UserController.getUserById);
router.put(
  '/users/:id',
  authenticateToken,
  uploads.single('avatar'),
  UserController.updateUser
);

// Маршруты постов
router.post('/posts', authenticateToken, PostController.createPost);
router.get('/posts', authenticateToken, PostController.getAllPosts);
router.get('/posts/:id', authenticateToken, PostController.getPostById);
router.delete('/posts/:id', authenticateToken, PostController.deletePost);

// Маршруты комментариев
router.post('/comments', authenticateToken, CommentController.createComment);
router.delete(
  '/comments/:id',
  authenticateToken,
  CommentController.deleteComment
);

// Маршруты лайков
router.post('/likes', authenticateToken, LikeController.likePost);
router.delete('/likes/:id', authenticateToken, LikeController.unlikePost);

// Маршруты подписок
router.post('/follow', authenticateToken, FollowController.followUser);
router.delete(
  '/unfollow/:id',
  authenticateToken,
  FollowController.unfollowUser
);

module.exports = router;
