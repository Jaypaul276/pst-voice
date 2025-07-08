const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Optional: Health check route (important for Render)
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Login credentials
const users = {
  "Jay": "index1",
  "Admin": "server1"
};

const socketToUser = {};
const userToSocket = {};

// Handle socket connections
io.on("connection", (socket) => {
  // Handle login
  socket.on("login", ({ username, password }) => {
    if (users[username] === password || password === "__RESUME__") {
      socketToUser[socket.id] = username;
      userToSocket[username] = socket.id;
      socket.emit("login-success", username);
      io.emit("user-list", Object.keys(userToSocket));
    } else {
      socket.emit("login-failed");
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const username = socketToUser[socket.id];
    if (username) {
      delete socketToUser[socket.id];
      delete userToSocket[username];
      io.emit("user-list", Object.keys(userToSocket));
    }
  });

  // Handle WebRTC signaling
  socket.on("offer", ({ to, offer }) => {
    const target = userToSocket[to];
    if (target) {
      io.to(target).emit("incoming-call", { from: socketToUser[socket.id], offer });
    }
  });

  socket.on("answer", ({ to, answer }) => {
    const target = userToSocket[to];
    if (target) {
      io.to(target).emit("answer", { answer });
    }
  });

  socket.on("candidate", ({ to, candidate }) => {
    const target = userToSocket[to];
    if (target) {
      io.to(target).emit("candidate", { candidate });
    }
  });
});

// Use Render-assigned port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
