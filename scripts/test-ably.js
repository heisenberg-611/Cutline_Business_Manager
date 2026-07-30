async function test() {
  try {
    const AblyModule = await import('ably');
    const Ably = AblyModule.default || AblyModule;
    console.log("Keys in Ably:", Object.keys(Ably));
    if (Ably.Rest) {
      console.log("Ably.Rest exists!");
    } else {
      console.log("Ably.Rest DOES NOT exist!");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
