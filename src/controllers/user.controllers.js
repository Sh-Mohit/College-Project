import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {
    uploadOnCloudinary,
    deleteFromCloudinary
} from "../utils/cloudinary.js"
import { User } from "../models/user.models.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {

    try {

        const user = await User.findById(userId).select("-password -refreshToken")

        if (!user) {
            throw new error
        }
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        // console.log(accessToken);
        // console.log(refreshToken);

        return { refreshToken, accessToken}

    } catch (error) {
        throw new ApiError(500, "Error occurred while generating access token")
    }

}





const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body

    if ([username, email, password].some((field) => field.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with given email or username already exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file missing")
    }


    let avatarPath;
    try {
        avatarPath = await uploadOnCloudinary(avatarLocalPath)
        // console.log(`Avatar file uploaded successfully`, avatarPath);

    } catch (error) {
        console.log("Failed to upload avatar", error);
        throw new ApiError(500, "Avatar file failed to upload")

    }

    try {
        const user = await User.create({
            username: username.toLowerCase(),
            email,
            password,
            avatar: avatarPath.url
        })

        const createdUser = await User.findById(user._id).select("-password -refreshToken")
        if (!createdUser) {
            throw new ApiError(500, "Failed to register")
        }


        return res
            .status(200)
            .json(new ApiResponse(200, createdUser, "Registerd user successfully"))

    } catch (error) {

        if (avatarPath) {
            await deleteFromCloudinary(avatarPath.public_id)
        }

        throw new ApiError(500, "Something went wrong while registering a user and no image is uploaded", error)
    }
})

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body
    // console.log(req.body);

    if (email === "") {
        throw new ApiError(400, "All fields are required")
    }
    

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (!user) {
        throw new ApiError(404, "No user exists with such credentials")
    }
    // console.log(2);
    
    const isPassValid = await user.isPasswordCorrect(password)
    if (!isPassValid) {
        throw new ApiError(400, "Incorrect password")
    }
    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(user._id)
    console.log(accessToken);
    
    const loggedInUser = await User.findById(user?._id).select("-password -refreshToken")
    if (!loggedInUser) {
        throw new ApiError(500, "Something went wrong while genaerating refreshToken and accessToken")
    }

    const options = {
        httpOnly: true,
        secured: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {user: loggedInUser,
            accessToken,
            refreshToken
        }, "User logged in successfully"))

})

const logoutUser = asyncHandler( async (req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken : undefined }
        },
        { new : true}
    )

    const options = {
        httpOnly: true,
        secured: process.env.NODE_ENV === "production"
    }

    return res
            .status(200)
            .clearCookie("accessToken")
            .clearCookie("refreshToken")
            .json(new ApiResponse(
                200,
                {},
                "Logged out user"
            ))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    const decodedRefreshToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedRefreshToken._id)
    if(!user){
        throw new ApiError(400, "Invalid refreshToken")
    }

    const { accessToken, refreshToken : newRefreshToken} = await generateAccessAndRefreshToken(user)

    user.refreshToken = newRefreshToken
    await user.save({validateBeforeSave: false})

    const options = {
        httpOnly: true,
        secured: process.env.NODE_ENV === "production"
    }

    return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(201, {
                accessToken,
                refreshToken: newRefreshToken
            },
            "Tokens updated successfully"
        ))
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { oldPassword, newPassword} = req.body
    if(!newPassword){
        throw new ApiError(400, "New password cannot be empty")
    }

    const user = await User.findById(req.user._id)
    if(!user){
        throw new ApiError(404, "No user found")
    }

    const isPassValid = await user.isPasswordCorrect(oldPassword)
    if(!isPassValid){
        throw new ApiError(400, "Incorrect old password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})
    return res
            .status(201)
            .json( new ApiResponse(201, {}, "Password updated successfully"))
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(201).json(new ApiResponse(201, req.user, "User info fetched successfully"))
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    const { username, email } = req.body
    
    if(username === "" || email === ""){
        throw new ApiError(400, "All fields ar erequired")
    }
    // console.log(req.user._id);
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                username : username,
                email: email
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    if(!user){
        throw new ApiError(500, "Server error occurred while saving changes")
    }

    return res
            .status(201)
            .json(new ApiResponse(201, user, "User info updated successfully"))
})

const updateAvatarImage = asyncHandler( async (req, res) => {
    console.log(req.files);
    
    try {

        const avatarLocalPath = req.file?.path
        console.log(avatarLocalPath);
        
        if(!avatarLocalPath){
            throw new ApiError(400, "Avatar file is missing")
        }
        const avatarPath = await uploadOnCloudinary(avatarLocalPath)
        if(!avatarPath.url){
            throw new ApiError(500, "Failed to upload avatar")
        }
        
        
        const user = await User.findByIdAndUpdate(
            req.body._id,
            {
                $set: { avatar: avatarPath.url}
            },
            { new: true}
        ).select("-password -refreshToken")

        return res
                .status(201)
                .json(new ApiResponse(201, user, "Avatar updated successfully"))
    } catch (error) {
        throw new ApiError(500, "Server error")
    }
})

const getUserProfile = asyncHandler( async (req, res) => {

    const userId = req.user._id
    if(!userId){
        throw new ApiError(400, "Invalid userId")
    }

    try {
        
        const user = await User.aggregate([
            {
                $match: {
                    _id: userId
                }
            },
            { 
                $lookup: {
                    from: "rooms",
                    localField: "_id",
                    foreignField: "users.userId",
                    as: "joinedRooms",
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                banner: 1
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    username: 1,
                    email: 1,
                    avatar: 1,
                    joinedRooms: 1
                }
            }
        ])
        
        return res
                .status(200)
                .json(new ApiResponse(200, 
                    user, 
                    "User info fetched successfully"
                ))
        
    } catch (error) {
        throw new ApiError( 500, "Server error occurred while fetching user-info")
    }
})





export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAvatarImage,
    updateAccountDetails,
    getUserProfile
}