import mongoose, { Schema } from "mongoose";


const notificationSchema = new Schema({
    content: {
        type: String,
        trim: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)




export const Notification = new mongoose.model("Notification", notificationSchema)