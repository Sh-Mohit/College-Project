import { Router } from "express"
import { upload } from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import {
    createRoom,
    deleteRoom,
    generateJoinLink,
    getRoomInfo,
    joinRoom,
    joinRoomUsingLink,
    leaveRoom,
    enterRoom
} from "../controllers/room.controllers.js"


const router = Router()


router.route("/create-room").post(verifyJWT, upload.single("banner"), createRoom)
router.route("/delete-room/:roomId").delete(verifyJWT, deleteRoom)
router.route("/join-room").post(verifyJWT, joinRoom)
router.route("/gen-join-link/:roomId").post(verifyJWT, generateJoinLink)
router.route("/join-room-using-link").get(verifyJWT, joinRoomUsingLink)
router.route("/get-room-info/:roomId").get(verifyJWT, getRoomInfo)
router.route("/leave-room/:roomId").delete(verifyJWT, leaveRoom)
router.route("/enter-room/:roomId").post(verifyJWT,enterRoom)




export default router