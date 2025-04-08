import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { Room } from "../models/room.models.js"
import { ChatRoom } from "../models/chatRoom.models.js"
import { Log } from "../models/log.models.js"
import { Message } from "../models/message.models.js"
import mongoose from "mongoose"
import { User } from "../models/user.models.js"
import jwt from "jsonwebtoken"

function verifyAdmin(usersArray, userId) {
    // console.log(usersArray);

    const user = usersArray.find(user => user.userId.equals(new mongoose.Types.ObjectId(userId)) && user.role === "admin")
    // console.log(user);

    return Boolean(user)
}

function extractPublicId(url) {
    const publicId = url.split('/').pop().split('.')[0]
    // console.log(url);

    return publicId
}

const deleteLogAndMessageFunc = async (roomId, objectname) => {

    try {
        let imageURLs;
        if (objectname === "log") {

            const logs = await Log.find({ room: roomId })
            // storing all images urls 
            imageURLs = logs.flatMap(log => log.images)
            const deletinglogs = await Log.deleteMany({ room: roomId })

        } else if (objectname === "chat") {

            const chats = await Message.find({ room: roomId })
            // storing all images urls             
            imageURLs = chats.flatMap(log => log.images)
            const deletingChats = await Message.deleteMany({ room: roomId })

        }

        if (imageURLs.length > 0) {
            await Promise.all(imageURLs.map(async (item) => {
                const publicId = extractPublicId(item)
                try {
                    const result = await deleteFromCloudinary(publicId)

                } catch (error) {
                    throw new ApiError(500, `Failed to delete ${objectname}-image with public-id ${publicId}`, error)
                }
            }))
        }
        return true

    } catch (error) {
        throw new ApiError(500, `Error occurred deleting ${objectname}`, error)
    }
}

const checkUserAlreadyInRoom = (usersArray, userId) => {
    const findUser = usersArray.find(user => user.userId.equals(new mongoose.Types.ObjectId(userId)))

    return Boolean(findUser)
}







const createRoom = asyncHandler(async (req, res) => {
    const { roomName, description, password } = req.body
    if (roomName === "" || password === "") {
        throw new ApiError(400, "Required fields cannot be empty")
    }

    const existedRoom = await Room.findOne({ "name": roomName })
    if (existedRoom) {
        throw new ApiError(409, "Room already exists with given name")
    }

    const bannerLocalPath = req.file?.path
    let bannerPath;
    if (bannerLocalPath) {

        try {
            bannerPath = await uploadOnCloudinary(bannerLocalPath)
        } catch (error) {
            throw new ApiError(500, "Error occurred uploading banner")
        }
    } else {
        bannerPath = ""
    }

    try {
        const createRoom = await Room.create({
            name: roomName,
            description,
            banner: bannerPath.url || "",
            password,
            users: [
                {
                    userId: req.user._id,
                    role: "admin"
                }
            ]
        })

        if (!createRoom) {
            throw new ApiError(500, "Server error occurred while creating room")
        }

        const createChatRoom = await ChatRoom.create({
            room: createRoom._id
        })

        if (!createChatRoom) {
            throw new ApiError(500, "Server error occurred while creating chat-room")
        }

        const createdRoom = await Room.findByIdAndUpdate(
            createRoom._id,
            { $set: { chatRoom: createChatRoom._id } }
        ).select("-password")

        if (!createdRoom) {
            throw new ApiError(500, "Server error occurred while creating room + chat-room")
        }

        return res.status(200).json(new ApiResponse(200, createdRoom, "Room created successfully"))

    } catch (error) {

        if (bannerPath?.public_id) {
            await deleteFromCloudinary(bannerPath.public_id)
        }

        throw new ApiError(500, "Server error occurred while creating room (general)")
    }

})

const deleteRoom = asyncHandler(async (req, res) => {
    const userId = req.user._id

    const { roomId } = req.params
    if (!roomId) {
        throw new ApiError(400, "Room id is required")
    }

    const room = await Room.findById(roomId)
    if (!room) {
        throw new ApiError(404, "No room found")
    }

    // chats, chatRoom, logs & log-images, room

    if (!verifyAdmin(room.users, userId)) {
        throw new ApiError(403, "Only admins can delete a room")
    }

    const publicId = extractPublicId(room.banner)

    const deletionSession = await mongoose.startSession()

    deletionSession.startTransaction()

    try {
        const deletingChat = await deleteLogAndMessageFunc(roomId, "chat")
        const deletingLog = await deleteLogAndMessageFunc(roomId, "log")

        try {
            const deletingBanner = await deleteFromCloudinary(publicId)
        } catch (error) {
            throw new ApiError(500, `Failed to delete ${objectname}-image with public-id ${publicId}`, error)
        }

        const deleteChatRoom = await ChatRoom.deleteOne({
            room: roomId
        })
        const deleteRoom = await Room.findByIdAndDelete(roomId)

        deletionSession.commitTransaction()
        console.log("Deletion performed");
        deletionSession.endSession()

        return res.status(200).json(new ApiResponse(200, deleteRoom, "Room deleted sucessfully"))

    } catch (error) {
        deletionSession.abortTransaction()
        throw new ApiError(500, "server error occurred ", error)
        deletionSession.endSession()

    }
})

const joinRoom = asyncHandler(async (req, res) => {``

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(400, "Invalid user id")
    }

    const { roomId, inputRoomPassword } = req.body
    if (!inputRoomPassword) {
        throw new ApiError(400, "Password is required")
    }

    const user = await User.findById(userId).select("-password -refreshToken")
    if (!user) {
        throw new ApiError(404, "No user found")
    }
    const room = await Room.findById(roomId)
    if (!room) {
        throw new ApiError(404, "No room found")
    }

    if (checkUserAlreadyInRoom(room.users, userId)) {
        throw new ApiError(403, "User already in selected room")
    }

    if (!room.isPasswordCorrect(inputRoomPassword)) {
        throw new ApiError(403, "Invalid room password")
    } else {
        try {
            room.users.push({ userId: userId, role: "user" })
            await room.save({ validateBeforeSave: false })

            return res.status(200).json(new ApiResponse(200, room, "Joined room successfully"))
        } catch (error) {
            throw new ApiError(500, "Server error occurred while joining room", error)
        }
    }

})

const generateJoinLink = asyncHandler(async (req, res) => {

    const userId = req.user._id

    const { roomId } = req.params
    if (!roomId) {
        throw new ApiError(400, "Room id is required")
    }

    let room;
    try {
        room = await Room.findById(roomId).select("-password")
        if (!room) {
            throw new ApiError(404, "No room found")
        }
    } catch (error) {
        throw new ApiError(500, "Server error occurred while fetching room info", error)
    }

    if (!verifyAdmin(room.users, userId)) {
        throw new ApiError(403, "Only admins can generate a room join link")
    }

    const joinToken = jwt.sign(
        {
            roomId: roomId,
            role: "user"
        },
        process.env.JOIN_TOKEN_SECRET,
        { expiresIn: process.env.JOIN_TOKEN_EXPIRY }
    )

    return res
        .status(200)
        .json(new ApiResponse(200,
            { joinLink: `http://localhost:${process.env.PORT}/api/v1/room/gen-join-link?token=${joinToken}` },
            "link generated"
        ))
})

const joinRoomUsingLink = asyncHandler(async (req, res) => {

    const userId = req.user._id
    if (!userId) {
        throw new ApiError(400, "Invalid user id")
    }

    const user = await User.findById(userId).select("-password -refreshToken")
    if (!user) {
        throw new ApiError(404, "No user found")
    }

    const {incomingToken} = req.query
    if (!incomingToken) {
        throw new ApiError(400, "Invalid token")
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(
            incomingToken,
            process.env.JOIN_TOKEN_SECRET
        )
    } catch (error) {
        throw new ApiError(404, "Token expired", error)
    }

    try {
        const room = await Room.findById(decodedToken.roomId).select("-password")
        if (!room) {
            throw new ApiError(400, "Room doesn't exist")
        }

        if (checkUserAlreadyInRoom(room.users, userId)) {
            throw new ApiError(403, "User already in selected room")
        }

        room.users.push({
            userId: userId,
            role: decodedToken.role
        })

        await room.save({ validateBeforeSave: false })

        return res
            .status(200)
            .json(new ApiResponse(200, room, "Joined successfully"))
    } catch (error) {
        throw new ApiError(500, "Server error occurred while joining room")
    }
})

// should add feature if last admin leaves, automatically promote random user to admin ???
const leaveRoom = asyncHandler( async (req, res) => {
    
    const userId = req.user._id        
    const {roomId} = req.params
    if(!userId){
        throw new ApiError(400, "No user found")
    }
    if(!roomId){
        throw new ApiError(400, "Invalid room id")
    }

    try {
        
        const room = await Room.findById(roomId).select("-password -banner")        

        if(!room.users.some( user => user.userId.toString() === userId.toString())){
            throw new ApiError(400, "User not in room")
        }
        
        room.users = room.users.filter( user => user.userId.toString() !== userId.toString())        
    
        await room.save({validateBeforeSave: false})
    
        return res
                .status(200)
                .json(new ApiResponse(200, room, "Left room successfully"))
    
    } catch (error) {
        throw new ApiError(500,  "Server error occurred while leaving room")
    }
})

const getRoomInfo = asyncHandler( async (req, res) => {

    const { page = 1, limit = 10} = req.query
    const {roomId} = req.params
    // console.log(roomId);
    const roomIdObject = new mongoose.Types.ObjectId(roomId)

    // console.log(page, limit);
    

    if(!roomId){
        throw new ApiError(400, "Invalid room id")
    }

    try {
        const room = await Room.aggregate([
            {
                $match: {
                    _id: roomIdObject
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "users.userId",
                    foreignField: "_id",
                    as: "roomUser",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                avatar: 1
                            }
                        },
                        {
                            $sort: {
                                username : 1
                            }
                        }
                    ]
                },
            },
            {
                $addFields: {
                    users: {
                        $map: {
                            input: "$users",
                            as: "user",
                            in: {
                                userId: "$$user.userId",
                                role: "$$user.role",
                                avatar: {
                                    $arrayElemAt: [
                                        "$roomUser.avatar", 
                                        { $indexOfArray: ["$roomUser._id", "$$user.userId"] }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ])
        .skip((page - 1) * limit)
        .limit( parseInt(limit))

        // console.log(room);
        

        return res
                .status(200)
                .json(new ApiResponse(200, 
                    room, 
                    "Room info fetched successfully"
                ))
        
            
    } catch (error) {
        throw new ApiError(500, "Server error occurred while fetching room-info")
    }
})

const enterRoom = asyncHandler( async (req, res) => {
    
})






export {
    createRoom,
    deleteRoom,
    joinRoom,
    generateJoinLink,
    joinRoomUsingLink,
    getRoomInfo,
    leaveRoom
}

/* suggested...

    if (error instanceof CloudinaryError) {
        throw new ApiError(500, "Cloudinary error occurred");
    }
*/