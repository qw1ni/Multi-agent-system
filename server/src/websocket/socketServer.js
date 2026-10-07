import { Server } from 'socket.io';

class SocketServer {
  constructor() {
    this.io = null;
  }

  init(httpServer, corsOptions) {
    this.io = new Server(httpServer, {
      cors: corsOptions
    });

    console.log('Socket.io успешно инициализирован');

    this.io.on('connection', (socket) => {
      console.log(`[WS Connection] Пользователь подключился: ${socket.id}`);

      socket.on('subscribe_parser_logs', () => {
        socket.join('parser_logs_room');
        console.log(`[WS Room] Клиент ${socket.id} вошел в комнату логов парсера`);
      });

      socket.on('disconnect', () => {
        console.log(`[WS Disconnect] Пользователь отключился: ${socket.id}`);
      });
    });
  }

  emitParserLog(logData) {
    if (!this.io) {
      console.error('[WS Error] Попытка отправить лог до инициализации SocketServer');
      return;
    }
    this.io.to('parser_logs_room').emit('new_parser_log', logData);
  }
}


const socketServerInstance = new SocketServer();
export default socketServerInstance;