#Использование образа линукса alpine с версией node14
FROM node:20.12.2-alpine

#Указываем рабочую дерикторию
WORKDIR /app

#Скопировать package.json && package-lock.json внутрь контейнера
COPY package*.json ./

#Установка зависимостей
RUN npm install

#Копирование оставшегося приложения в контейнер
COPY . .

#Установка Prisma
RUN npm install -g prisma

#Генерация Prisma client
RUN prisma generate

#Копирование Prisma schema 
COPY prisma/schema.prisma ./prisma/

#Открытие порта
EXPOSE 3000

#Запуск сервера
CMD ["npm", "start"]