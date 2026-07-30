require('dotenv').config({ path: '.env' });
const Ably = require('ably');

async function test() {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.log("No API key");
    return;
  }
  const ably = new Ably.Rest(apiKey);
  
  // Use a dummy conversation ID just to see if the channel logic works
  const conversationId = "7a29e24f-f236-4074-b5de-87ef1be24cf3"; // Just a random UUID format
  const channel = ably.channels.get(`conversation-${conversationId}`);
  
  try {
    await channel.publish('new-message', {
      id: "test-id",
      content: "Hello from CLI",
      createdAt: new Date().toISOString()
    });
    console.log("Published!");
  } catch (e) {
    console.error("Failed to publish:", e);
  }
}
test();
