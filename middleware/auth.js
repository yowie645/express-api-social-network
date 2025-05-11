const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Получаем токен из заголовка Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен отсутствует' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      console.error('Ошибка верификации токена:', err.message);
      return res.status(403).json({
        error: 'Недействительный токен',
        ...(process.env.NODE_ENV === 'development' && { details: err.message }),
      });
    }

    const userId = Number(decoded.userId);
    if (isNaN(userId)) {
      return res
        .status(403)
        .json({ error: 'Некорректный ID пользователя в токене' });
    }

    req.user = {
      userId: userId,
      ...(decoded.email && { email: decoded.email }),
      ...(decoded.name && { name: decoded.name }),
    };

    next();
  });
};

module.exports = { authenticateToken };
