import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeAFriend,
    checkFriendRequests
} from "../controllers/friendRequest.controllers.js"


const router = Router()


router.route("/send-request/:receiverId").post(verifyJWT, sendFriendRequest)
router.route("/accept-request/:requestId").post(verifyJWT, acceptFriendRequest)
router.route("/reject-request/:requestId").delete(verifyJWT, rejectFriendRequest)
router.route("/remove-friend/:friendUserId").delete(verifyJWT, removeAFriend)
router.route("/check-requests").get(verifyJWT, checkFriendRequests)





export default router