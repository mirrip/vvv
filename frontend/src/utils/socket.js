import io from 'socket.io-client';

const SOCKET_URL = 'http://192.168.1.100:3000';
let socket = null;

export const connectSocket = (userId) => {
  if (!socket) {
    socket = io(SOCKET_URL, { query: { userId } });
  }
  return socket;
};

export { socket };