import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Log } from "../models/log.models.js";
import { Room } from "../models/room.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

import { io } from "../app.js"



async function uploaderFunction(array) {

    try {
        if (array.length > 4) {
            throw new ApiError(400, "Max 4 images are allowed")
        }

        const validPaths = array.filter(item => item !== undefined)

        const rexArray = await Promise.all(
            validPaths.map(imageLocalPath => uploadOnCloudinary(imageLocalPath))
        )

        return rexArray
    } catch (error) {
        throw new ApiError(500, "Server error occurred uploading images at uploader function")
    }
}

async function deletionFunction (array){
    try {
        await Promise.all(
            array.map( async element => 
                deleteFromCloudinary(element.public_id)
            )
        )
    } catch (error) {
        throw new ApiError(500, "Servver error occurred while cleaning up images")
    }
}





const pushALog = async (reqOrParams, res = null) => {
    
    const isHttpRequest = !!res // Check if called via HTTP (req, res) or socket.io (params only)

    const { logText, logURL, roomId, userId} = isHttpRequest ? { 
        logText : reqOrParams.body.logtext, 
        logURL : reqOrParams.body.logurl, 
        roomId : reqOrParams.params.roomId, 
        userId: reqOrParams.user._id
    } 
    : reqOrParams

    if (logText === "") {
        throw new ApiError(400, "Text is required")
    }

    const getRoom = await Room.findById(roomId).select("-password -users -banner -description -log -chatRoom")
    if(!getRoom){
        throw new ApiError(404, "No room exists with given room-id")
    }

    // const imagesLocalPathArray = [
    //     req.files?.images[0]?.path,
    //     req.files?.images[1]?.path,
    //     req.files?.images[2]?.path,
    //     req.files?.images[3]?.path
    // ]
    const imagesLocalPathArray = isHttpRequest ? reqOrParams.files?.images || [] : [];

    let uploadedImagesPathArray;
    try {
        uploadedImagesPathArray = await uploaderFunction(imagesLocalPathArray)
    } catch (error) {
        throw new ApiError(500, "Server error occurred uploading images")
    }


    try {
        const createALog = await Log.create({
            content: logText,
            url: logURL || "",
            images: uploadedImagesPathArray,
            owner: userId,
            room: roomId
        })        

        const createdLog = await Log.findById( createALog._id)

        const updatingRoomLog = await Room.findByIdAndUpdate(
            roomId,
            {
                $addToSet: { log : createdLog._id}
            },
            { new: true }
        )

        if(!createdLog){
            throw new ApiError(500, "Server error occurred pushing log")
        }

        if(isHttpRequest){
            return res.status(200).json(new ApiResponse(200, createdLog, "Log pushed successfully"))
        }

        return createdLog;
    } catch (error) {
        
        if(uploadedImagesPathArray){
            await deletionFunction(uploadedImagesPathArray)
            console.log("removed scsfly");
            
        }

        throw new ApiError(500, "Server error occurred creating log (general)", error)
    }
}

const deleteALog =async( reqOrParams, res = null) => {

    // const { userId, roomId, logId } = req.params

    const isHttpRequest = !!res // Check if called via HTTP (req, res) or socket.io (params only)
    const { userId, roomId, logId} = isHttpRequest ? {
        userId : req.user._id,
        roomId: req.params.roomId,
        logId: req.params.logId
    } : reqOrParams 


    if([userId, roomId, logId].some( item => item === "")){
        throw new ApiError(400, "Invalid request")
    }    

    const room = await Room.findById(roomId).select("-banner")
    if(!room){
        throw new ApiError(400, "Room doesn't exist")
    }

    const verifyAdmin = await Room.aggregate([
        {
            $match: {
                "users.userId": userId,
                "users.role": "admin"
            }
        }
    ])
    if(!verifyAdmin){
        throw new ApiError(400, "Only admins can perform log removal")
    }

    if(!logId){
        throw new ApiError(404, "No log found")
    }
    const log = await Log.findById(logId).select("-content -url -owner -room")


    try {
        const logDeletion = await Log.findByIdAndDelete(logId, {new : true})
        const deletionFromRoom = await Room.findByIdAndUpdate(
            roomId,
            {
                $pull: {
                    "log" : userId
                }
            }
        )
        await deletionFunction(log.images)

        console.log("items deleted successfully");

        if(isHttpRequest){
            return res
                    .status(200)
                    .json(new ApiResponse(200, {logDeletion, deletionFromRoom}, "Deleted successfully"))
        }

        return logDeletion;
    } catch (error) {
        throw new ApiError(500, "Server error occurred while deleting log (general) ", error)
    }
    
}


export {
    pushALog,
    deleteALog
}

/* 
const ifUserAdmin = await Room.findOne({
    "users.userId" : userId,
    "users.role" : "admin"
})
*/