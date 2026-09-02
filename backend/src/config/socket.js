const { Server } = require("socket.io");

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`⚡ [Socket.IO] Client connected: ${socket.id}`);

    // Join company isolated room
    socket.on("join-company", (companyId) => {
      if (companyId) {
        socket.join(`company_${companyId}`);
        console.log(`🏢 Socket ${socket.id} joined room: company_${companyId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };