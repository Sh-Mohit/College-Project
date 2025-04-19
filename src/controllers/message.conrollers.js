import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Message } from "../models/message.models.js";
import { ChatRoom } from "../models/chatRoom.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { io } from "../app.js";
import { Room } from "../models/room.models.js";

async function uploaderFunction(array) {

    try {
        if (array.length > 4) {
            throw new ApiError(400, "Max 4 images are allowed")
        }

        const validPaths = array.filter(item => item !== undefined)

        const rexArray = await Promise.all(
            validPaths.map(imageLocalPath => uploadOnCloudinary(imageLocalPath))
        )
        console.log(rexArray);
        // console.log(9);

        return rexArray
    } catch (error) {
        throw new ApiError(500, "Server error occurred uploading images at uploader function")
    }
}

async function deletionFunction(array) {
    try {
        await Promise.all(
            array.map(async element =>
                deleteFromCloudinary(element.public_id)
            )
        )
    } catch (error) {
        throw new ApiError(500, "Servver error occurred while cleaning up images")
    }
}






const pushAMessage = async (reqOrParams, res = null) => {
    // Check if called via HTTP (req, res) or socket.io (params only)
    const isHttpRequest = !!res;

    // Extract parameters based on the context
    const { messageText, messageURL, roomId, userId } = isHttpRequest
        ? { 
            messageText: reqOrParams.body.messageText, 
            messageURL: reqOrParams.body.messageURL, 
            roomId: reqOrParams.params.roomId, 
            userId: reqOrParams.user._id 
        }
        : reqOrParams; // For socket.io, parameters are passed directly


    if(!roomId){
        throw new ApiError(400, "RoomId is required")
    }

    const gettingRoom = await Room.findById(roomId)
    if (!gettingRoom) {
        throw new ApiError(400, "Room doesn't exist")
    }
    const chatRoomId = gettingRoom?.chatRoom
    if (!chatRoomId) {
        throw new ApiError(403, "ChatRoom ID is required");
    }

    const verifyChatRoom = await ChatRoom.findById(chatRoomId);
    if (!verifyChatRoom) {
        throw new ApiError(404, "No room exists with this roomId");
    }

    const imagesLocalPathArray = isHttpRequest ? reqOrParams.files?.images || [] : [];
    let uploadedImagesArray;
    if (imagesLocalPathArray.length > 0) {
        uploadedImagesArray = await uploaderFunction(imagesLocalPathArray);
    } else {
        uploadedImagesArray = [];
    }

    try {
        // Create the message in the database
        const createAMessage = await Message.create({
            text: messageText || "",
            images: uploadedImagesArray,
            url: messageURL || "",
            owner: userId,
            chatRoom: new mongoose.Types.ObjectId(chatRoomId),
        });

        const message = await Message.findById(createAMessage._id);
        if (!message) {
            throw new ApiError(500, "Server error occurred while creating message");
        }

        // Add the message to the chat room
        verifyChatRoom.message.push(message._id);
        await verifyChatRoom.save({ validateBeforeSave: false });

        // Emit the message to the room via socket.io
        io.to(chatRoomId).emit("message", message);

        // Return response for HTTP requests
        if (isHttpRequest) {
            return res.status(200).json(new ApiResponse(200, message, "Message sent..."));
        }

        // Return the message for socket.io
        return message;
    } catch (error) {
        if (uploadedImagesArray) {
            await deletionFunction(uploadedImagesArray);
        }

        throw new ApiError(500, "Server error occurred while creating message (general)", error.message);
    }
}

const deleteAMessage = async (reqOrParams, res = null) => {

    // const userId = req.user._id
    // const { chatRoomId, messageId } = req.params

    const isHttpRequest = !!res // Check if called via HTTP (req, res) or socket.io (params only)
    const {userId, chatRoomId, messageId } = isHttpRequest ? {
        userId: reqOrParams.user._id,
        chatRoomId: reqOrParams.params.chatRoomId,
        messageId: reqOrParams.params.messageId
    } : reqOrParams; // For socket.io, parameters are passed directly


    if ([userId, chatRoomId, messageId].some(item => item === "")) {
        throw new ApiError(400, "Invalid request")
    }

    const chatRoom = await ChatRoom.findById(chatRoomId)
    if (!chatRoom) {
        throw new ApiError(400, "Room doesn't exist")
    }
    if (!messageId) {
        throw new ApiError(404, "No message found")
    }

    const getMessage = await Message.findById(messageId)
    if (getMessage.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Not authorised")
    }


    // const log = await Message.findById(logId).select("-content -url -owner -room")


    try {
        const messageDeletion = await Message.findByIdAndDelete(messageId, { new: true })
        const deletionFromChatRoom = await ChatRoom.findByIdAndUpdate(
            chatRoomId,
            {
                $pull: {
                    "message": messageId
                }
            }
        )
        await deletionFunction(getMessage.images)

        // console.log("items deleted successfully");

        if(isHttpRequest){
            return res
                .status(200)
                .json(new ApiResponse(200,
                    { messageDeletion, deletionFromChatRoom },
                    "Deleted successfully"
                ))
        }

        return messageDeletion;

    } catch (error) {
        throw new ApiError(500, "Server error occurred while deleting message (general) ", error)
    }

}


export {
    pushAMessage,
    deleteAMessage
}