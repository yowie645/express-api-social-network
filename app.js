const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Логирование запросов
app.use(logger('dev'));

// Парсинг JSON и URL-encoded данных
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());

// Настройки CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://client-social-network-nu.vercel.app',
  'https://client-social-network-git-main-yowie645.vercel.app',
  /\.vercel\.app$/,
];

const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.some((allowedOrigin) =>
        typeof allowedOrigin === 'string'
          ? origin === allowedOrigin
          : allowedOrigin.test(origin)
      )
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Подключение роутов
app.use('/api', require('./routes'));

// Обработка 404
app.use((req, res, next) => {
  next(createError(404, 'Страница не найдена'));
});

// Обработчик ошибок
app.use((err, req, res, next) => {
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
