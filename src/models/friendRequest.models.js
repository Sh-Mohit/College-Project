import mongoose, { Schema } from "mongoose";

const friendRequestSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Sender is required"]
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Receiver is required"]
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    }
},
    { timestamps: true }
)



export const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema)