const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game State Storage
const rooms = {};

// Constants
const MAP_WIDTH = 1600;
const MAP_HEIGHT = 1200;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (roomId, name) => {
    // 1. Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        players: {},
        tasks: [],
        gameState: 'LOBBY',
        winner: null
      };
      console.log(`Created room: ${roomId}`);
    }

    const room = rooms[roomId];

    // 2. Add Player
    const newPlayer = {
      id: socket.id,
      name: name || `Player ${socket.id.substr(0,4)}`,
      x: 400 + Math.random() * 100,
      y: 300 + Math.random() * 100,
      color: Math.floor(Math.random() * 0xffffff),
      role: 'CREWMATE',
      isDead: false,
      velocity: { x: 0, y: 0 }
    };

    room.players[socket.id] = newPlayer;
    socket.join(roomId);
    
    // 3. Notify Room
    socket.emit('state:update', room); // Send full state to joiner
    io.to(roomId).emit('player:joined', newPlayer); // Notify others

    console.log(`${name} joined room ${roomId}`);

    // Handle Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('player:left', socket.id);
        
        // Clean up empty room
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted`);
        }
      }
    });

    // Handle Input (Phase 2 placeholder)
    socket.on('input:move', (vector) => {
      const player = rooms[roomId]?.players[socket.id];
      if (player && !player.isDead) {
        player.velocity = vector;
      }
    });
  });
});

// Server Loop (30Hz)
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (room.gameState === 'PLAYING') {
      // Physics logic would go here
      // For now, simple position update based on velocity
      for (const playerId in room.players) {
        const p = room.players[playerId];
        if (!p.isDead) {
          p.x += p.velocity.x * 5; // Simplified speed
          p.y += p.velocity.y * 5;
        }
      }
      io.to(roomId).emit('state:update', room);
    }
  }
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});