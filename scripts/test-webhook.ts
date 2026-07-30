import { POST } from './src/app/api/webhooks/resend-inbound/route';
import { NextRequest } from 'next/server';

const payload = {
  type: 'email.received',
  created_at: '2024-02-22T21:46:17.375Z',
  data: {
    created_at: '2024-02-22T21:46:17.260Z',
    email_id: 'c1f71465-9080-4d43-a63e-72bc207038bb',
    from: 'acme@example.com',
    to: ['support@cutlin.tech'],
    subject: 'hello world',
  }
};

const req = new Request('http://localhost/api', {
  method: 'POST',
  body: JSON.stringify(payload)
});

async function run() {
  const res = await POST(req);
  const json = await res.json();
  console.log(res.status, json);
}

run();
