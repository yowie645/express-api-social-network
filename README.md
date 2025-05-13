<img src="screenshots/prev.jpg" width="100%" height="200px" alt="Preview">

<h1 align="center">💫 About Project:</h1>

## 🧸 ExpressClientSocialNetwork — Backend API

This is the server part of a social network written in Node.js using Express. The API provides functionality for registration, authentication, user profile management, publications, and subscriptions.

## Base URL

- http://localhost:3000/api

## 💻 Tech Stack:

![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB) ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

- **This is the backend repository the frontend for this repository is located here - https://github.com/yowie645/client-social-network**

### ✨ Key Features

- **User Authentication:** Secure registration and login with JWT (JSON Web Tokens).
- **Cloud storage:** Secure file storage with support for media uploads (images). Files are hosted on scalable cloud platforms, ensuring fast access and reliability.
- **Database:** Powered by PostgreSQL for flexible data management, enabling efficient handling of user profiles, posts, comments, and relationships. Features indexing for optimized queries and scalability.
- **API Documentation**: Well-structured API endpoints with examples for easy integration.

## 📄 API Documentation

| Method   | Endpoint       | Request Body (JSON)                                                                                                | Description / Auth     |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `POST`   | `/register`    | `{"email":"string","name":"string","password":"string"}`                                                           | Create user ❌         |
| `POST`   | `/login`       | `{"email":"string","password":"string"}`                                                                           | Authentication user ❌ |
| `GET`    | `/current`     | Not required                                                                                                       | Data current user ✅   |
| `POST`   | `/users:id`    | Not required                                                                                                       | Data User ✅           |
| `PUT`    | `/users:id`    | `{"email": "string", "name": "string", "avatarUrl": "string", "bio": null, "location": null, "dateOfBirth": null}` | Put data User ✅       |
| `POST`   | `/posts`       | `{"content": "string", "authorId": number}`                                                                        | Create posts ✅        |
| `GET`    | `/posts`       | Not required                                                                                                       | Get post ✅            |
| `GET`    | `/posts:id`    | Not required                                                                                                       | Get post by id ✅      |
| `DELETE` | `/posts:id`    | Not required                                                                                                       | Delete post by id ✅   |
| `POST`   | `/comments`    | `{"postId": number, "userId": number}, "content": "string"}`                                                       | Create comment ✅      |
| `DELETE` | `/comments:id` | Not required                                                                                                       | Delete comment ✅      |
| `POST`   | `/likes`       | `{"postId": number, "userId": number}`                                                                             | Create like ✅         |
| `DELETE` | `/likes:id`    | `:id(post id)`                                                                                                     | Delete like ✅         |
| `POST`   | `/follow`      | `{"followingId": number}`                                                                                          | Follow on user ✅      |
| `DELETE` | `/unfollow:id` | `:id(user id)`                                                                                                     | Unfollow on user ✅    |

### 🌈.ENV

- **DATABASE_URL**= DATABASE_URL

- **SECRET_KEY** = SECRET_KEY

- **YC_ACCESS_KEY_ID**=YC_ACCESS_KEY_ID

- **YC_SECRET_ACCESS_KEY**=YC_SECRET_ACCESS_KEY

- **YC_BUCKET_NAME**=YC_BUCKET_NAME

## 📸 Screenshots

### 🖼️ Interface

![1](screenshots/1.jpg)
_Yandex cloud was used for storage._
![2](screenshots/2.jpg)
_A database created on postgresql in the render service_
![3](screenshots/3.jpg)
_The API storage server is also created on render_

---

## 🛠️ Installation

### Prerequisites

- Docker
- Node.js

## 🪭 Quick Setup

### Clone repository

- git clone https://github.com/yowie645/express-api-social-network.git
- cd client-social-network

## Scripts

- `dev`/`start` - start dev server

<img src="screenshots/prev.jpg" width="100%" height="200px" alt="Preview">
