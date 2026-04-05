# Concurrent Banking Transaction System

A high-performance full-stack banking application designed to handle high concurrency using optimistic locking and real-time updates.

## 🚀 Features

- **Optimistic Concurrency Control**: Uses a `version` field to prevent race conditions during simultaneous transactions.
- **Automatic Retries**: Implements a retry mechanism (up to 3 attempts) when version conflicts occur.
- **Real-time Updates**: Uses Socket.io to push balance updates and transaction events to all connected clients instantly.
- **Zod Validation**: Robust schema validation for all API requests.
- **Production-Ready Architecture**: Clean separation of concerns with Express backend and React frontend.

## 🛠 Tech Stack

- **Frontend**: React, Tailwind CSS, Motion, Lucide Icons
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.io
- **Validation**: Zod
- **Testing**: k6 (Load Testing)

## 🏗 Folder Structure

```
├── src/                # Frontend React application
│   ├── App.tsx         # Main UI and Socket.io client
│   └── main.tsx        # Entry point
├── server.ts           # Express server with Socket.io and API logic
├── load-test.js        # k6 load testing script
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## 🔐 Concurrency Implementation

The system uses **Optimistic Locking**:
1. Read the current account state (including `version`).
2. Calculate the new balance.
3. Before saving, check if the `version` in the database still matches the `version` we read.
4. If it matches, update the balance and increment the `version`.
5. If it doesn't match, another transaction occurred in between. Retry the process.

## 🚦 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

## 📈 Load Testing

To run the load test (requires k6 installed):
```bash
k6 run load-test.js
```

## ☁️ Deployment

### Render / Vercel
1. Connect your GitHub repository.
2. Set the build command: `npm run build`
3. Set the start command: `npm start`
4. Ensure `NODE_ENV=production` is set in environment variables.
5. local run 
