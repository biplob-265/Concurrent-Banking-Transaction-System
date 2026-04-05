import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  History, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  User
} from 'lucide-react';

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
  timestamp: string;
  status: 'success' | 'failed';
  targetAccountId?: string;
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [targetAccount, setTargetAccount] = useState<string>('');
  const [type, setType] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    fetchAccounts();
    fetchTransactions();

    newSocket.on('balance:updated', ({ accountId, balance }: { accountId: string; balance: number }) => {
      setAccounts(prev => prev.map(acc => acc.accountId === accountId ? { ...acc, balance } : acc));
    });

    newSocket.on('transaction:created', (txn: Transaction) => {
      setTransactions(prev => [txn, ...prev]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].accountId);
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount,
          type,
          amount: parseFloat(amount),
          targetAccountId: type === 'transfer' ? targetAccount : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: 'Transaction successful!', type: 'success' });
        setAmount('');
      } else {
        setMessage({ text: data.error || 'Transaction failed', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentAccount = accounts.find(a => a.accountId === selectedAccount);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Wallet className="w-8 h-8 text-indigo-600" />
              Concurrent Banking
            </h1>
            <p className="text-slate-500 mt-1">High-concurrency transaction system with optimistic locking</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Live System</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Accounts Sidebar */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">Accounts</h2>
            {accounts.map(acc => (
              <button
                key={acc.accountId}
                onClick={() => setSelectedAccount(acc.accountId)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border ${
                  selectedAccount === acc.accountId
                    ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-100'
                    : 'bg-slate-100 border-transparent hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${selectedAccount === acc.accountId ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm truncate">{acc.holderName}</span>
                </div>
                <div className="text-lg font-bold text-slate-900">
                  ${acc.balance.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                  ID: {acc.accountId} • v{acc.version}
                </div>
              </button>
            ))}
          </div>

          {/* Transaction Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">New Transaction</h2>
              </div>
              
              <form onSubmit={handleTransaction} className="p-8 space-y-6">
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                  {(['deposit', 'withdraw', 'transfer'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${
                        type === t 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  {type === 'transfer' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Account ID</label>
                      <select
                        value={targetAccount}
                        onChange={(e) => setTargetAccount(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        required
                      >
                        <option value="">Select recipient</option>
                        {accounts.filter(a => a.accountId !== selectedAccount).map(a => (
                          <option key={a.accountId} value={a.accountId}>
                            {a.holderName} ({a.accountId})
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {type === 'deposit' && <ArrowDownLeft className="w-5 h-5" />}
                      {type === 'withdraw' && <ArrowUpRight className="w-5 h-5" />}
                      {type === 'transfer' && <ArrowLeftRight className="w-5 h-5" />}
                      Confirm {type}
                    </>
                  )}
                </button>

                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-4 rounded-xl flex items-center gap-3 ${
                        message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}
                    >
                      {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      <span className="text-sm font-medium">{message.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Transaction History
              </h2>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                {transactions.length} Total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    <th className="px-6 py-4 border-b border-slate-100">ID</th>
                    <th className="px-6 py-4 border-b border-slate-100">Type</th>
                    <th className="px-6 py-4 border-b border-slate-100">Account</th>
                    <th className="px-6 py-4 border-b border-slate-100">Amount</th>
                    <th className="px-6 py-4 border-b border-slate-100">Status</th>
                    <th className="px-6 py-4 border-b border-slate-100">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence initial={false}>
                    {transactions.length > 0 ? (
                      transactions.map((txn) => (
                        <motion.tr
                          key={txn.transactionId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-xs font-mono text-slate-400">{txn.transactionId}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter ${
                              txn.type === 'deposit' ? 'bg-emerald-50 text-emerald-600' :
                              txn.type === 'withdraw' ? 'bg-amber-50 text-amber-600' :
                              'bg-blue-50 text-blue-600'
                            }`}>
                              {txn.type === 'deposit' && <ArrowDownLeft className="w-3 h-3" />}
                              {txn.type === 'withdraw' && <ArrowUpRight className="w-3 h-3" />}
                              {txn.type === 'transfer' && <ArrowLeftRight className="w-3 h-3" />}
                              {txn.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">
                            {txn.accountId}
                            {txn.targetAccountId && (
                              <span className="text-slate-300 mx-1">→ {txn.targetAccountId}</span>
                            )}
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold ${
                            txn.type === 'deposit' ? 'text-emerald-600' : 'text-slate-900'
                          }`}>
                            {txn.type === 'deposit' ? '+' : '-'}${txn.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              txn.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {txn.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {new Date(txn.timestamp).toLocaleTimeString()}
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex flex-wrap gap-4 justify-center text-xs font-medium text-slate-400 uppercase tracking-widest">
            <span>Optimistic Locking</span>
            <span className="text-slate-200">•</span>
            <span>Real-time Socket.io</span>
            <span className="text-slate-200">•</span>
            <span>Retry Logic</span>
            <span className="text-slate-200">•</span>
            <span>Zod Validation</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
