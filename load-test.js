import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 100 }, // Ramp up to 100 users
    { duration: '20s', target: 1000 }, // Stay at 1000 users
    { duration: '10s', target: 0 },   // Ramp down
  ],
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    accountId: 'ACC001',
    type: 'deposit',
    amount: 10,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/transactions`, payload, params);

  check(res, {
    'status is 200 or 409': (r) => r.status === 200 || r.status === 409,
    'transaction successful': (r) => r.status === 200,
  });

  sleep(0.1);
}
