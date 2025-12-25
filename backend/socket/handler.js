import { createGame, getGame } from "../game/gameManager.js";
import GameLogic from "../game/utils.js";

let waitingSocket = null;

export function registerSocketHandlers(io) {

  io.on("connection", (socket) => {
    console.log("🔌 Connected:", socket.id);

    /**
     * --------------------
     * JOIN GAME (2 PLAYER)
     * --------------------
     */
    socket.on("join_game", ({ name }) => { // NEW: receive name
      socket.data.name = name || "Player"; // NEW: store name on socket
      console.log("Name: ");
      console.log(name);

      // 🕒 First player waits
      if (!waitingSocket) {
        waitingSocket = socket;
        socket.emit("waiting", "Waiting for another player...");
        return;
      }

      // 🎮 Second player joins → start game
      const player1 = waitingSocket;
      const player2 = socket;
      waitingSocket = null;

      const roomId = `room-${player1.id}-${player2.id}`;

      player1.join(roomId);
      player2.join(roomId);

      // Store room info on sockets
      player1.data.roomId = roomId;
      player1.data.playerIndex = 0;

      player2.data.roomId = roomId;
      player2.data.playerIndex = 1;

      // NEW: include names in player metadata
      const players = [
        {
          id: player1.id,
          index: 0,
          name: player1.data.name
        },
        {
          id: player2.id,
          index: 1,
          name: player2.data.name
        }
      ];

      // Generate board once on server
      const dots = GameLogic.generateStaggeredDots(800, 600);

      createGame(roomId, players, dots);

      console.log(`🎮 Game started in ${roomId}`);

      // Notify players (send names too)
      player1.emit("game_start", {
        roomId,
        playerIndex: 0,
        players
      });

      player2.emit("game_start", {
        roomId,
        playerIndex: 1,
        players
      });

      // Send initial state
      io.to(roomId).emit("state_update", getGame(roomId).getState());
    });

    /**
     * --------------------
     * ROLL DICE
     * --------------------
     */
    socket.on("roll_dice", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const game = getGame(roomId);
      if (!game) return;

      if (game.turn !== socket.data.playerIndex) return;

      game.rollDice();
      io.to(roomId).emit("state_update", game.getState());
    });

    /**
     * --------------------
     * ATTEMPT CONNECTION
     * --------------------
     */
    socket.on("attempt_connection", ({ from, to }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const game = getGame(roomId);
      if (!game) return;

      if (game.turn !== socket.data.playerIndex) return;

      const success = game.attemptConnection(from, to);
      if (!success) return;

      io.to(roomId).emit("state_update", game.getState());
    });

    /**
     * --------------------
     * DISCONNECT HANDLING
     * --------------------
     */
    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);

      // If player was waiting, clear queue
      if (waitingSocket?.id === socket.id) {
        waitingSocket = null;
      }

      // If player was in a game
      const roomId = socket.data.roomId;
      if (roomId) {
        io.to(roomId).emit("game_over", "Opponent disconnected");
      }
    });
  });
}
