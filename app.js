const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Настройка CORS с явным указанием допустимых доменов
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://client-social-network-one.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Логирование запросов
app.use(logger('dev'));

// Парсинг тела запроса
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Корневой маршрут с информацией об API
app.get('/', (req, res) => {
  res.json({
    name: 'Social Network API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      posts: '/api/posts',
      users: '/api/users',
    },
  });
});

// Обработка favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Статические файлы
app.use('/uploads', express.static('uploads'));

// Проверка и создание папки uploads
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Основные API маршруты
const apiRouter = require('./routes');
app.use('/api', apiRouter);

// Обработка 404 ошибки
app.use((req, res, next) => {
  next(createError(404, `Resource ${req.path} not found`));
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  // Логирование ошибки
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  console.error(err.stack);

  // Формирование ответа
  const response = {
    error: {
      status: err.status || 500,
      message: err.message,
      path: req.path,
      timestamp: new Date().toISOString(),
    },
  };

  // Добавление stack trace только в development
  if (req.app.get('env') === 'development') {
    response.error.stack = err.stack;
  }

  res.status(err.status || 500).json(response);
});

module.exports = app;
