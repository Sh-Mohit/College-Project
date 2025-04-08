import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { upload } from "../middlewares/multer.middlewares.js"
import {
    deleteAMessage,
    pushAMessage
} from "../controllers/message.conrollers.js"


const router = Router()


router.route("/create-message/:chatRoomId").post(verifyJWT, upload.fields([
    {
        name: "images", maxCount: 4
    }
]), pushAMessage)
router.route("/delete-message/:messageId/:chatRoomId").delete(verifyJWT, deleteAMessage)



export default router