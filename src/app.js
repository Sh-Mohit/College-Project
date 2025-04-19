import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import userRouter from "./routes/user.routes.js"
import roomRouter from "./routes/room.routes.js"
import logRouter from "./routes/log.routes.js"
import friendRequestRouter from "./routes/friendrequest.routes.js"
import messageRouter from "./routes/message.routes.js"
import { Server } from "socket.io"
import { deleteAMessage, pushAMessage } from "./controllers/message.conrollers.js"
import { pushALog, deleteALog } from "./controllers/log.controllers.js"
import { enterRoom } from "./controllers/room.controllers.js"


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

    socket.on("enter-room", async (data) => {
        const { roomId, userId} = data;
        const sanitizedUserId = userId.trim();
        const sanitizedRoomId = roomId.trim();

        try {
            const userEnteredRoom = await enterRoom({
                userId: sanitizedUserId,
                roomId: sanitizedRoomId
            })

            socket.join(roomId);
            console.log(`User ${socket.id} entered room: ${roomId}`);

            io.to(roomId).emit("user-entered", `User ${socket.id} has entered the room`);
            socket.emit("room-entered", `Entered room successfully ${roomId}`);

        } catch (error) {
            console.log("Error enttering the room", error);
            console.log("error", "Failed to join room")
        }

        // const room = io.sockets.adapter.rooms.get(roomId);
        // console.log(room ? `Room ${roomId} exists with ${room.size} members` : `Room ${roomId} does not exist`);
    });

    socket.on("send-message", async (data) => {
        
        const { roomId, message, userId, msgurl, images } = data;
        try {
            const savedMessage = await pushAMessage({
                messageText : message,
                roomId: roomId,
                userId: userId,
                messageURL: msgurl,
                messageImages : images || []
            });

            // console.log(savedMessage);
            console.log(`Socket rooms:`, socket.rooms);
            console.log(`Room ${roomId} members:`, io.sockets.adapter.rooms.get(roomId));

            
            if (!socket.rooms.has(roomId)) {
                console.log(`Socket ${socket.id} is not part of room ${roomId}, forcing join.`);
                socket.join(roomId);
            }
            io.to(roomId).emit("message", `${savedMessage}`);
            
            console.log("sent");
            
        } catch (error) {
            console.log("Error saving message",error);
            socket.emit("error","Failed to send message");
        }
    });

    socket.on("delete-message", async (data) => {
        const {chatRoomId, messageId, userId, roomId} = data
        try{
            const messageDeletion = await deleteAMessage({
                userId: userId, 
                chatRoomId: chatRoomId, 
                messageId: messageId
            })

            if(!socket.rooms.has(roomId)){
                console.log(`Socket ${socket.id} is not part of room ${roomId}, forcing join.`);
                socket.join(roomId);
            }

            io.to(roomId).emit("message-deleted", `${messageDeletion}`);
            
            console.log("deleted message");
        } catch (error) {
            console.log("Error deleting message", error);
            socket.emit('error', "Failed to delete message")
        }
    })

    socket.on("push-log", async(data) => {
        const {roomId, logText, logURL, logImages, userId} = data
        
        try{
            const savedLog = await pushALog({
                logText: logText,
                roomId: roomId,
                userId: userId,
                logURL: logURL,
                logImages: logImages || []
            })

            console.log(`Socket rooms:`, socket.rooms);
            console.log(`Room ${roomId} members:`, io.sockets.adapter.rooms.get(roomId));

            if (!socket.rooms.has(roomId)) {
                console.log(`Socket ${socket.id} is not part of room ${roomId}, forcing join.`);
                socket.join(roomId);
            }
            io.to(roomId).emit("log", `${savedLog}`);
            
            console.log("log pushed");
        } catch(err){
            console.log("Error saving log", err);
            socket.emit("error","Failed to send log");
        }
    })

    socket.on("delete-log", async(data) => {
        const { roomId, logId,userId } = data;
        try {
            const logdeletion = await deleteALog({
                logId: logId,
                roomId: roomId,
                userId: userId
            })


            if (!socket.rooms.has(roomId)) {
                console.log(`Socket ${socket.id} is not part of room ${roomId}, forcing join.`);
                socket.join(roomId);
            }
            io.to(roomId).emit("log-deleted", `${logdeletion}`);
            
            console.log("log deleted");
        } catch (error) {
            console.log("Error deleting log", error);
            socket.emit("error", "Failed to delete log");
            
        }
    })
    
    
})



export { server , io}