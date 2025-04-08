import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import dotenv from "dotenv"


dotenv.config()


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(
            localFilePath, {
            resource_type: "auto"
        })

        fs.unlinkSync(localFilePath)
        return response
        
    } catch (error) {
        console.log("failed");
        
        fs.unlinkSync(localFilePath)
        return null
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if (publicId) {
            return null;
        }
        const response = await cloudinary.uploader.destroy(localFilePath)
        console.log(`File deleted from cloudinary`);

    } catch (error) {
        console.log(`Failed to delete from cloudinary`, error);
        return null
    }

}

export {
    uploadOnCloudinary,
    deleteFromCloudinary
}