import mongoose, { Schema } from "mongoose";


const logSchema = new Schema({
    content: {
        type: String,
        trim: true,
        required: true,
    },
    url: { 
        type: String, 
        validate: {
            validator: function(v) {
                if(!v)
                    return true
                return /^(http|https):\/\/[^\s$.?#].[^\s]*$/gm.test(v)
            },
            message: props => `${props.value} is not a valid URL!`
        },
        default: ""
    },
    images: {
        type: [Object],
        validate: {
            validator: function(v){
                return v.length <= 4
            },
            message: "Maximum of 4 images can be uploaded at a time"
        },
        default : []
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    room: {
        type: Schema.Types.ObjectId,
        ref: "Room",
        required: true,
    },
}, {
    timestamps: true
})

logSchema.index({createdAt : 1})


export const Log = mongoose.model("Log", logSchema)