import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import userRouter from "./routes/user.routes.js"
import roomRouter from "./routes/room.routes.js"
import logRouter from "./routes/log.routes.js"
import friendRequestRouter from "./routes/friendrequest.routes.js"
import messageRouter from "./routes/message.routes.js"
import { Server } from "socket.io"
import { pushAMessage } from "./controllers/message.conrollers.js"


const app = express()
const server = http.createServer(app)
const io = new Server(server)






app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))


app.use("/api/v1/user", userRouter)
app.use("/api/v1/room", roomRouter)
app.use("/api/v1/log", logRouter)
app.use("/api/v1/frequest", friendRequestRouter)
app.use("/api/v1/message", messageRouter)




app.get("/", (req, res) => {
    res.send("Welcome to home page");
})

io.on("connection", (socket) => {
    
    // console.log(socket);

    socket.on("enter-room", (roomId) => {
        socket.join(roomId); // Join the specific room
        console.log(`User ${socket.id} entered room: ${roomId}`);

        socket.emit("room-entered", `Entered room successfully ${roomId}`);
        io.to(roomId).emit("user-joined", `User ${socket.id} has joined the room`);
    });

    socket.on("send-message", async (data) => {
        
        const { roomId, message, userId, msgurl } = data;
        const xroomId = roomId;
        try {
            const savedMessage = await pushAMessage({
                messageText : message,
                roomId: roomId,
                userId: userId,
                messageURL: msgurl
            });
            console.log(savedMessage);
            io.to(xroomId).emit("message", `${savedMessage}`)
            console.log("sent");
            
        } catch (error) {
            console.log("Error saving message",error);
            socket.emit("error","Failed to send message");
        }
    });
    
})



export { server , io}