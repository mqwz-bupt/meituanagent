async function globalTeardown() {
  try {
    await fetch('http://localhost:3000/api/test/shutdown', { method: 'POST' });
  } catch {
    // The shutdown request can race with the server closing its own socket.
  }
}

export default globalTeardown;
