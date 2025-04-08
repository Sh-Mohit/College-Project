import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"

export const verifyJWT = asyncHandler( async (req, _,  next) => {
    const token =   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2RhOTNmYjNkN2FkOGVkMTgyYjBhNGYiLCJ1c2VybmFtZSI6InVzZXIyIiwiZW1haWwiOiJ1c2VyMkBnbWFpbC5jb20iLCJpYXQiOjE3NDMzOTg4NDYsImV4cCI6MTc0MzQ4NTI0Nn0.9rbnHLLpirOC9rU0LY5u0LrjogG31retQrK1Vw_HxWQ" || req.cookies.acccessToken || req.header("Authorization")?.replace("Bearer ", "")

    if(!token){
        throw new ApiError(401, "Unauthorized")
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(401, "Unauthorized")
        }

        req.user = user // passing our fetched user-info to the "req" object for further use in controller functions

        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})