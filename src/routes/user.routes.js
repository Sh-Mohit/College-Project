import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAvatarImage,
    updateAccountDetails,
    getUserProfile
} from "../controllers/user.controllers.js";


const router = Router()

// main route
router.route("/register").post(
    upload.fields([
        {name: "avatar", maxCount: 1}
    ]),
    registerUser
)

// unsecured route  i.e. no verifyJWT
router.route("/login").post(loginUser)
router.route("/refreshaccesstoken").post(refreshAccessToken)


// secured route
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-info").put(verifyJWT, updateAccountDetails)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/change-avatar").patch(verifyJWT, upload.single("avatar") ,updateAvatarImage)
router.route("/get-user-profile").get(verifyJWT, getUserProfile)

export default router