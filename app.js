const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const app = express();
const cors = require('cors');
require('dotenv').config();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Раздача статических файлов из папки uploads
app.use('/uploads', express.static('uploads'));

// Подключение роутов
app.use('/api', require('./routes'));

// Создание папки uploads, если её нет
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Обработка 404 ошибки
app.use(function (req, res, next) {
  next(createError(404, 'Страница не найдена'));
});

// Обработчик ошибок (возвращает JSON вместо рендеринга шаблона)
app.use(function (err, req, res, next) {
  // Логирование ошибки для разработки
  console.error(err.stack || err);

  // Устанавливаем статус ошибки
  res.status(err.status || 500);

  // Отправляем JSON с информацией об ошибке
  res.json({
    error: {
      message: err.message,
      status: err.status || 500,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
});

module.exports = app;
