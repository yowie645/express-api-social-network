const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Полная настройка CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://client-social-network-one.vercel.app',
  'https://client-social-network-git-main.yowie645.vercel.app',
  /\.vercel\.app$/, //поддомены vercel
];

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://client-social-network-one.vercel.app',
      'https://client-social-network-git-main-yowie645.vercel.app',
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// CORS ко всем маршрутам
app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

// Логирование запросов
app.use(logger('dev'));

// Парсинг тела запроса
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check endpoint с CORS
app.get('/health', cors(corsOptions), (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Корневой маршрут с информацией об API
app.get('/', cors(corsOptions), (req, res) => {
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
app.get('/favicon.ico', cors(corsOptions), (req, res) => res.status(204).end());

// Статические файлы с CORS
app.use('/uploads', cors(corsOptions), express.static('uploads'));

// Проверка и создание папки uploads
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Основные API маршруты
const apiRouter = require('./routes');
app.use('/api', cors(corsOptions), apiRouter);

// Обработка 404 ошибки
app.use((req, res, next) => {
  next(createError(404, `Resource ${req.path} not found`));
});

// Глобальный обработчик ошибок с CORS
app.use((err, req, res, next) => {
  // Устанавливаем CORS заголовки даже для ошибок
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
