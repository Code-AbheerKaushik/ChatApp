# 💬 Full-Stack Real-Time Chat Application

A modern, full-stack real-time chat application built with the **MERN stack** (MongoDB, Express, React, Node.js), **Socket.io** for low-latency WebSockets communication, **Zustand** for state management, and **TailwindCSS / DaisyUI** for styling.

![App Screenshot](frontend/public/screenshot-for-readme.png)

---

## ✨ Features

- 🔐 **Authentication & Authorization**: Secure JWT-based authentication stored in HTTP-only cookies.
- ⚡ **Real-Time Messaging**: Instant bi-directional messaging using Socket.io.
- 🟢 **Online Status Tracking**: Live indicator showing online/offline user states.
- 🖼️ **Image Attachment & Uploads**: Integrated with Cloudinary for fast media hosting.
- 🎨 **Modern Responsive UI**: Dynamic theme support with TailwindCSS and DaisyUI components.
- 📦 **State Management**: Lightweight global state handled cleanly with Zustand.

---

## 🛠️ Tech Stack

### **Frontend**
- **React 18** (Vite build tool)
- **Zustand** (Global state management)
- **TailwindCSS & DaisyUI** (Responsive UI components)
- **Socket.io-Client** (Real-time WebSocket connection)
- **Lucide React** (Modern iconography)
- **React Hot Toast** (Toast notifications)

### **Backend**
- **Node.js & Express.js** (REST API & Socket server)
- **MongoDB & Mongoose** (NoSQL database & object modeling)
- **Socket.io** (WebSocket server)
- **JWT & bcryptjs** (Secure authentication & password hashing)
- **Cloudinary SDK** (Media cloud storage)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local or MongoDB Atlas cluster)

---

### 1. Clone the repository
```bash
git clone https://github.com/Code-AbheerKaushik/ChatApp.git
cd ChatApp
```

---

### 2. Configure Environment Variables

**Backend** — create a `.env` file inside `backend/`:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development

# Firebase Admin SDK (from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Frontend** — create a `.env` file inside `frontend/`:

```env
# Firebase Client SDK (from Firebase Console > Project Settings > Your apps)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

---

### 3. Install Dependencies & Build
Run the following root command to install dependencies for both frontend & backend, and build the frontend assets:

```bash
npm run build
```

---

### 4. Run the Application

#### **Development Mode (Recommended)**
Run the backend server:
```bash
npm start
```

In a separate terminal, start the frontend Vite dev server with Hot Module Replacement (HMR):
```bash
npm run dev --prefix frontend
```
> Open **http://localhost:5173** in your browser.

#### **Production Mode**
Change `NODE_ENV=production` in `backend/.env` and start the server:
```bash
npm start
```
> Open **http://localhost:5001** in your browser.

---

## 📜 License
Distributed under the ISC License.
