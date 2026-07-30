import { Resend } from 'resend';
const resend = new Resend('re_123');
async function test() {
  console.log(resend.emails.receiving.get.toString());
}
test();
