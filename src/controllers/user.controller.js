import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // Get user details from the client (Postman)
    // validation
    // check if user is already present: username, email
    // check for images, check for avatar
    // if iamges is added upload them to cloudianry
    // create a user object to create a entry to the DB
    // remove password and refresh tokens field from response
    // check for user creation
    // send response

    // The most of the details are from (req.body) -> json,form

    const { fullName, username, email, password } = req.body;
    // console.log("email :", email); It was just to print the email for testing at initial

    // if (fullName === "") {
    //     throw new ApiError(400, "FullName is Required.")
    // }

    if (
        [fullName,email,username,password].some((field) => field?.trim() === "") // Need to know about 'some' method
    ) {
        throw new ApiError(400, "All Fields are Required.")
    }

    // Email vaditation need to be written

    // User.findOne(email) This is also possible to check the email but to take it to next level 
    // we go for 👇
    const existingUser = await User.findOne({
        $or: [{ username }, { email }] // To find more than one field from the DB
    })

    if (existingUser) {
        throw new ApiError(409,"User with username and email Already Exists.")
    }

    // To get the path of the image of avatar from local folder it will not be uploaded to cloudinary yet.
    const avatarLocalPath = req.files?.avatar[0]?.path; 
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; we are not using this bcoz we it'll cause error if we don't pass any cover to overcome this error we go with classic JS if condition.
    
    // console.log(req.files); to get

    // This is just to check we have coverImage or not
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is Required.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is Required.")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    
    // .select is used to select the required field from the DB , Here twe need to remove the password and refresh tokens before deleting from the DB.
    const createdUser = await User.findById(user._id).select(
        "-password -refreshTokens"
    );

    if (!createdUser) {
        throw new ApiError(500,"SomeThing went Wrong while registering the User.")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully.")
    )

});
export {
    registerUser,
}