import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { registerSocketHandlers } from "./socket/handler.js";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

registerSocketHandlers(io);

server.listen(3000, () => {
  console.log("🚀 Backend running on http://localhost:3000");
});
