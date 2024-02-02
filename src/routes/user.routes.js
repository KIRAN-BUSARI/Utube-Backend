import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([ // To upload multiple files at same time using middleware
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        },
    ]),
    registerUser
)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/getUser").get(verifyJWT, getCurrentUser)
router.route("/changePassword").get(verifyJWT, changeCurrentPassword)
router.route("/updateAccountDetails").get(verifyJWT, updateAccountDetails)
router.route("/updateCurrentAvatar").get(verifyJWT, updateUserAvatar)
router.route("/updateCoverImage").get(verifyJWT, updateUserCoverImage)
router.route("/getUserChannelProfile").get(verifyJWT, getUserChannelProfile)

export default router;