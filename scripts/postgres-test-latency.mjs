// Retrasa exclusivamente el tráfico entre dos puertos locales de la base de pruebas.
// Usar jdbc:postgresql://127.0.0.1:55533/TP_INFO3 en los dos servidores del ensayo.
import net from 'node:net';
import { Transform } from 'node:stream';

function delay() {
  return new Transform({
    transform(chunk, encoding, callback) {
      setTimeout(() => callback(null, chunk), 40);
    },
  });
}

net.createServer(client => {
  const database = net.connect({ host: '127.0.0.1', port: 55433 });
  client.pipe(delay()).pipe(database);
  database.pipe(delay()).pipe(client);
  client.on('error', () => database.destroy());
  database.on('error', () => client.destroy());
  client.on('close', () => database.destroy());
  database.on('close', () => client.destroy());
}).listen(55533, '127.0.0.1', () => {
  console.log('Base de pruebas en 55533 con 80 ms añadidos por ida y vuelta hacia 55433.');
});
