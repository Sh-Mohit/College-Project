import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

export const verifyJWT = asyncHandler(async (req, _, next) => {

    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODAzNmQ4NTdhODdlY2YwNzhkZTBhZDQiLCJ1c2VybmFtZSI6InVzZXIxIiwiZW1haWwiOiJ1c2VyMUBnbWFpbC5jb20iLCJpYXQiOjE3NDUwNTUxNDMsImV4cCI6MTc0NTE0MTU0M30.2sxFqgzlKOqN4lrmsX0j_YeNsOEV9Egf2H-o3Vc5oxo" || req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")

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