import { v2 as cloudinary } from "cloudinary"; // Documentation https://console.cloudinary.com/pm/c-4564212a031a7da1ec366b6a02fc95/getting-started
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_API,  
    api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        // Upload  the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // File as ben uploaded successfully
        // console.log("File is uploaded successfully to cloudinary....!", response.url);
        fs.unlinkSync(localFilePath) // To delete the images as they upload or fail to upload
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // Removes the locally saved file as the upload gets failed
        return null;        
    }
}

export { uploadOnCloudinary }