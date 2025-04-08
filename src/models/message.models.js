import mongoose, { Schema } from "mongoose"


const messageSchema = new Schema({
    text: {
        type: String,
        trim: true,
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
        default: []
    },
    url: { 
        type: String, 
        validate: {
            validator: function(v) {
                if(!v)
                    return true
                else(v.length != 0)
                    return /^(http|https):\/\/[^\s$.?#].[^\s]*$/gm.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        },
        default: ""
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    chatRoom: {
        type: Schema.Types.ObjectId,
        ref: "ChatRoom",
        required: true
    }
},{
    timestamps: true
})

// messageSchema.index({createdAt : 1})


export const Message = mongoose.model("Message", messageSchema)