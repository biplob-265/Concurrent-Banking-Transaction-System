import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- In-Memory Database for Demo (Simulating MongoDB with Optimistic Locking) ---
interface Account {
  accountId: string;
  holderName: string;
  balance: number;
  version: number;
}

interface Transaction {
  transactionId: string;
  accountId: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  timestamp: Date;
  status: 'success' | 'failed';
  targetAccountId?: string;
}

const accounts: Map<string, Account> = new Map();
const transactions: Transaction[] = [];

// Initialize with some data
accounts.set('ACC001', { accountId: 'ACC001', holderName: 'John Doe', balance: 1000, version: 1 });
accounts.set('ACC002', { accountId: 'ACC002', holderName: 'Jane Smith', balance: 500, version: 1 });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  app.use(cors());
  app.use(express.json());

  // --- API Routes ---

  // Get all accounts
  app.get('/api/accounts', (req, res) => {
    res.json(Array.from(accounts.values()));
  });

  // Get all transactions
  app.get('/api/transactions', (req, res) => {
    res.json(transactions.slice().reverse()); // Return latest first
  });

  // Transaction Schema
  const TransactionSchema = z.object({
    accountId: z.string(),
    type: z.enum(['deposit', 'withdraw', 'transfer']),
    amount: z.number().positive(),
    targetAccountId: z.string().optional(),
  });

  // Process Transaction with Optimistic Locking and Retry Logic
  app.post('/api/transactions', async (req, res) => {
    const result = TransactionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues });
    }

    const { accountId, type, amount, targetAccountId } = result.data;
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      const account = accounts.get(accountId);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const currentVersion = account.version;

      // Business Logic
      if (type === 'withdraw' || type === 'transfer') {
        if (account.balance < amount) {
          io.emit('transaction:failed', { accountId, reason: 'Insufficient balance' });
          return res.status(400).json({ error: 'Insufficient balance' });
        }
      }

      if (type === 'transfer' && !targetAccountId) {
        return res.status(400).json({ error: 'Target account required for transfer' });
      }

      // Simulate some processing delay to increase chance of race condition for testing
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

      // Optimistic Locking Check
      const latestAccount = accounts.get(accountId);
      if (!latestAccount || latestAccount.version !== currentVersion) {
        retries++;
        console.log(`Version mismatch for ${accountId}, retry ${retries}/${MAX_RETRIES}`);
        continue; // Retry
      }

      // Perform Update
      if (type === 'deposit') {
        latestAccount.balance += amount;
      } else if (type === 'withdraw') {
        latestAccount.balance -= amount;
      } else if (type === 'transfer') {
        const target = accounts.get(targetAccountId!);
        if (!target) {
          return res.status(404).json({ error: 'Target account not found' });
        }
        latestAccount.balance -= amount;
        target.balance += amount;
        target.version += 1; // Increment target version too
      }

      latestAccount.version += 1;
      accounts.set(accountId, latestAccount);

      const transaction: Transaction = {
        transactionId: `TXN${Date.now()}`,
        accountId,
        type,
        amount,
        timestamp: new Date(),
        status: 'success',
        targetAccountId,
      };
      transactions.push(transaction);

      io.emit('transaction:created', transaction);
      io.emit('balance:updated', { accountId, balance: latestAccount.balance });
      if (type === 'transfer') {
        io.emit('balance:updated', { accountId: targetAccountId, balance: accounts.get(targetAccountId!)?.balance });
      }

      return res.json({ message: 'Transaction successful', transaction });
    }

    io.emit('transaction:failed', { accountId, reason: 'Concurrency limit reached' });
    res.status(409).json({ error: 'Transaction failed due to high concurrency. Please try again.' });
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
