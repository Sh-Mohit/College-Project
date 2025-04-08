import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Message } from "../models/message.models.js";
import { ChatRoom } from "../models/chatRoom.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

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
        console.log(9);

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






const pushAMessage = asyncHandler( async (req, res) => {
    
    const { messageText , messageURL } = req.body
    const { chatRoomId } = req.params

    if(!chatRoomId){
        throw new ApiError(403, "ChatRoom id is required")
    }

    const verifyChatRoom = await ChatRoom.findById(chatRoomId)
    if(!verifyChatRoom){
        throw new ApiError(404, "No room exists with this roomId")
    }

    const imagesLocalPathArray = req.files.images || []
    let uploadedImagesArray;
    if(imagesLocalPathArray){
        uploadedImagesArray = imagesLocalPathArray
    } else {
        uploadedImagesArray = await uploaderFunction(imagesLocalPathArray)
    }
    
    try {
        const createAMessage = await Message.create({
            text: messageText || "",
            images: uploadedImagesArray,
            url: messageURL || "",
            owner: req.user._id,
            chatRoom: new mongoose.Types.ObjectId(chatRoomId)
        })        

        const message = await Message.findById(createAMessage._id)
        if(!message){
            throw new ApiError(500, "Server error occurred while creating message")
        }

        verifyChatRoom.message.push(message._id)
        await verifyChatRoom.save({validateBeforeSave: false})

        return res
                .status(200)
                .json(new ApiResponse(200, message, "Message sent..."))
    } catch (error) {
        if(uploadedImagesArray){
            await deletionFunction(uploadedImagesArray)
        }

        throw new ApiError(500, "Server error occurred while creating message (general) ", error.message)
    }
})

const deleteAMessage = asyncHandler(async (req, res) => {

    const userId = req.user._id
    const { chatRoomId, messageId } = req.params
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

        console.log("items deleted successfully");

        return res
            .status(200)
            .json(new ApiResponse(200,
                { messageDeletion, deletionFromChatRoom },
                "Deleted successfully"
            ))

    } catch (error) {
        throw new ApiError(500, "Server error occurred while deleting message (general) ", error)
    }

})


export {
    pushAMessage,
    deleteAMessage
}