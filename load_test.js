import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 3,           // Simulate 3 concurrent students asking questions
  duration: '45s',  // Blast the API continuously for 45 seconds
};

export default function () {
  // Target the internal Docker network hostname
  const url = 'http://backend:8000/api/chat/stream';
  
  const payload = JSON.stringify({
    question: "Explique-moi le programme du Master Big Data de la FSBM en 300 mots.",
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // k6 will hold the connection open until the LLM finishes streaming
  const res = http.post(url, payload, params);

  check(res, {
    'status was 200': (r) => r.status === 200,
  });
  
  sleep(1);
}