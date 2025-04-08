import mongoose, { Schema } from "mongoose";


const chatRoomSchema = new Schema({
    message: [
        {
            type: Schema.Types.ObjectId,
            ref: "Message"
        }
    ],
    room: {
        type: Schema.Types.ObjectId,
        ref: "Room",
        required: true
    }
},
    {
        timestamps: true
    }
)


export const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema)