import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { upload } from "../middlewares/multer.middlewares.js"
import { deleteALog, pushALog } from "../controllers/log.controllers.js"



const router = Router()

router.route("/create-log/:roomId").post(verifyJWT, upload.fields([
    {
        name: "images", maxCount: 4
    }
]), pushALog)

router.route("/delete-log/:userId/:roomId/:logId").delete(verifyJWT, deleteALog)


export default router