import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"


const roomSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    banner: {
        type: String
    },
    users: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
            role: {
                type: String,
                enum: ["admin", "user"],
                default: "user"
            }
        }
    ],
    log: [
        {
            type: Schema.Types.ObjectId,
            ref: "Log"
        }
    ],
    password: {
        type: String,
        trim: true,
        required: true
    },
    chatRoom: {
        type: Schema.Types.ObjectId,
        ref: "ChatRoom"
    }
}, {
    timestamps: true
})



roomSchema.pre("save", async function (next) {
    if (!this.isModified("password"))  return next()
        
    this.password = await bcrypt.hash(this.password, 10)

    next()
})

roomSchema.methods.isPasswordCorrect = function(password){
    return bcrypt.compare(password, this.password)
}



export const Room = mongoose.model("Room", roomSchema)