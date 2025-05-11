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
// app.set("view engine", "jade");

// Раздача статических файлов из папки uploads
app.use('/uploads', express.static('uploads'));

app.use('/api', require('./routes'));

// Проверка и создание папки uploads если ее нет
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Обработка 404 ошибки
app.use(function (req, res, next) {
  next(createError(404));
});

// Обработчик ошибок в JSON формате
app.use(function (err, req, res, next) {
  // Логирование ошибки для разработки
  if (req.app.get('env') === 'development') {
    console.error(err);
  }

  // Отправка ошибки в JSON формате
  res.status(err.status || 500);
  res.json({
    error: {
      status: err.status || 500,
      message: err.message,
      // Дополнительные детали только в режиме разработки
      ...(req.app.get('env') === 'development' && { stack: err.stack }),
    },
  });
});

// Обработчик для favicon.ico чтобы избежать лишних 404 ошибок
app.get('/favicon.ico', (req, res) => res.status(204).end());

module.exports = app;
