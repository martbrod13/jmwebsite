/*
 * Powiadomienia na żywo dla panelu (Server-Sent Events).
 * Gdy klientka zarezerwuje, przeniesie albo odwoła wizytę, otwarte panele odświeżają się same.
 */
const clients = new Set();

function subscribe(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 3000\n\n');
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

function emit(type, data) {
  const msg = `event: change\ndata: ${JSON.stringify(Object.assign({ type, at: new Date().toISOString() }, data))}\n\n`;
  clients.forEach((res) => { try { res.write(msg); } catch (e) { clients.delete(res); } });
}

// podtrzymanie połączenia (serwery pośredniczące zamykają ciche połączenia)
setInterval(() => clients.forEach((res) => { try { res.write(': ping\n\n'); } catch (e) { clients.delete(res); } }), 25000).unref();

module.exports = { subscribe, emit, count: () => clients.size };
