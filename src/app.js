import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import userRouter from "./routes/user.routes.js"
import roomRouter from "./routes/room.routes.js"
import logRouter from "./routes/log.routes.js"
import friendRequestRouter from "./routes/friendrequest.routes.js"
import messageRouter from "./routes/message.routes.js"
import { Server } from "socket.io"


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




io.on("connection", (socket) => {
    console.log(socket);
    
})



export { server }