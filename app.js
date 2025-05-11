const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Логирование запросов
app.use(logger('dev'));

// Парсинг JSON и URL-encoded данных
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Настройки CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://client-social-network-nu.vercel.app',
  'https://client-social-network-git-main-yowie645.vercel.app',
  /\.vercel\.app$/, // все поддомены vercel
];

const corsOptions = {
  origin: function (origin, callback) {
    // Разрешить запросы без origin (например, от мобильных приложений или Postman)
    if (!origin) return callback(null, true);

    // Проверяем соответствие origin списку разрешенных
    if (
      allowedOrigins.some((allowedOrigin) =>
        typeof allowedOrigin === 'string'
          ? origin === allowedOrigin
          : allowedOrigin.test(origin)
      )
    ) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  optionsSuccessStatus: 204,
};

// Применяем CORS ко всем маршрутам
app.use(cors(corsOptions));

// Разрешаем preflight-запросы
app.options('*', cors(corsOptions));

// Раздача статических файлов
app.use('/uploads', express.static('uploads'));

// Подключение роутов
app.use('/api', require('./routes'));

// Создание папки uploads, если её нет
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
// После создания папки uploads
if (process.env.NODE_ENV === 'production') {
  app.use('/uploads', (req, res, next) => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    next();
  });
}
app.use(
  '/uploads',
  (req, res, next) => {
    const ext = path.extname(req.path);
    if (ext === '.png') res.type('image/png');
    else if (ext === '.jpg' || ext === '.jpeg') res.type('image/jpeg');
    next();
  },
  express.static('uploads')
);
// Обработка 404
app.use(function (req, res, next) {
  next(createError(404, 'Страница не найдена'));
});

// Обработчик ошибок
app.use(function (err, req, res, next) {
  console.error(err.stack || err);

  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

module.exports = app;
