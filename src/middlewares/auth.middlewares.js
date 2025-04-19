import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

export const verifyJWT = asyncHandler(async (req, _, next) => {

    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2UxYTBiNmVlMjE4NDY5MjJlODEyNWUiLCJ1c2VybmFtZSI6InVzZXIzIiwiZW1haWwiOiJ1c2VyM0BnbWFpbC5jb20iLCJpYXQiOjE3NDQ5ODI2OTcsImV4cCI6MTc0NTA2OTA5N30.3GeBZYoP8kZbc0zlxH9Qb38Jq9Asz6g6xLQtYMx0CtY" || req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
        throw new ApiError(401, "Unauthorized")
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Unauthorized")
        }

        req.user = user // passing our fetched user-info to the "req" object for further use in controller functions

        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})