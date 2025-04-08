import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose"
import { User } from "../models/user.models.js"
import { FriendRequest } from "../models/friendRequest.models.js"




const sendFriendRequest = asyncHandler(async (req, res) => {
    const senderId = req.user._id
    const { receiverId } = req.params
    if (!senderId) {
        throw new ApiError(400, "Invalid user id")
    }
    if (!receiverId) {
        throw new ApiError(400, "Invalid receiver id")
    }

    const receiver = await User.findById(receiverId).select("-password -refreshToken -avatar -email")
    if (!receiver) {
        throw new ApiError(404, "User doesn't exists")
    }

    try {
        const createFriendRequest = await FriendRequest.create({
            sender: senderId,
            receiver: receiverId,
            status: "pending"
        })

        const friendRequest = await FriendRequest.findById(createFriendRequest._id)
        if (!friendRequest) {
            throw new ApiError(500, "Server error occurred while sending friend request")
        }

        return res
            .status(200)
            .json(new ApiResponse(200,
                friendRequest,
                "friend request sent !"
            ))
    } catch (error) {
        throw new ApiError(500, "Server error occurred while sending friend request")
    }

})

const acceptFriendRequest = asyncHandler(async (req, res) => {

    const { requestId } = req.params
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(400, "Invalid user id")
    }


    const updationSession = await mongoose.startSession()
    updationSession.startTransaction()

    try {

        const friendRequest = await FriendRequest.findById(requestId)
        const senderUser = await User.findById(friendRequest.sender).select("-password -avatar -refreshToken")
        const receiverUser = await User.findById(userId).select("-password -avatar -refreshToken")

        if (userId.toString() !== friendRequest.receiver.toString()) {
            throw new ApiError(403, "Not authorised")
        }

        if (senderUser.friends.some(user => user.userId.toString() === userId.toString())) {
            throw new ApiError(409, `Already in ${senderUser.username}'s friend list`)
        }

        senderUser.friends.push({ userId: userId })
        receiverUser.friends.push({ userId: senderUser._id })

        await senderUser.save({ validateBeforeSave: false })
        await receiverUser.save({ validateBeforeSave: false })

        updationSession.commitTransaction()
        updationSession.endSession()

        await FriendRequest.findByIdAndDelete(requestId)

        return res
            .status(200)
            .json(200, { senderUser, receiverUser }, "Request accepted")

    } catch (error) {
        updationSession.abortTransaction()
        updationSession.endSession()

        throw new ApiError(500, "Server error occurred while accepting friend request")
    }
})

const rejectFriendRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params
    const userId = req.user._id

    try {
        const friendRequest = await FriendRequest.findById(requestId)
        if (friendRequest.receiver.toString() !== userId.toString()) {
            throw new ApiError(403, "Not authorised")
        }

        await FriendRequest.findByIdAndDelete(requestId)

        return res.status(200).json(new ApiResponse(200, {}, "Friend request rejected"))

    } catch (error) {
        throw new ApiError(500, "Server error occurred while processing your request")
    }
})

const removeAFriend = asyncHandler(async (req, res) => {

    const userId = req.user._id
    const { friendUserId } = req.params
    if (!friendUserId) {
        throw new ApiError(400, "user id not found")
    }

    const updationSession = await mongoose.startSession()
    updationSession.startTransaction()
    try {

        const friendUser = await User.findById(friendUserId).select("-password -refreshToken -avatar")
        if (!friendUser) {
            throw new ApiError(404, "user not found")
        }
        const currentUser = await User.findById(userId).select("-password -refreshToken -avatar")

        friendUser.friends = friendUser.friends.filter(user => user.userId.toString() !== userId.toString())
        currentUser.friends = currentUser.friends.filter(user => user.userId.toString() !== friendUserId.toString())

        await friendUser.save({ validateBeforeSave: false })
        await currentUser.save({ validateBeforeSave: false })

        updationSession.commitTransaction()
        updationSession.endSession()

        return res
            .status(200)
            .json(new ApiResponse(200, { friendUser, currentUser }, "user removed successfully"))

    } catch (error) {

        updationSession.abortTransaction()
        updationSession.endSession()

        throw new ApiError(500, "Server error occurred while removing user")
    }
})

const checkFriendRequests = asyncHandler(async (req, res) => {
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(400, "User id not found")
    }

    try {
        const user = await User.findById(userId).select("-password -refreshToken -avatar -friends -email")
        if (!user) {
            throw new ApiError(404, "No user found, please login first")
        }

        const allFriendRequests = await FriendRequest.aggregate([
            {
                $match: {
                    receiver: userId
                }
            }
        ])
        if (!allFriendRequests) {
            return res
                .status(200)
                .json(new ApiResponse(200, allFriendRequests, "No friend requests"))
        }

        return res
            .status(200)
            .json(new ApiResponse(200,
                allFriendRequests,
                "All friend requests fetched successfully"
            ))
    } catch (error) {
        throw new ApiError(500, "Server error occurred while fetching friend requests")
    }
})




export {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeAFriend,
    checkFriendRequests
}