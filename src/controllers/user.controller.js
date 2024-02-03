import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndrefreshToken = async (userId) => {
    try {
        const user = await User.findOne(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

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
        [fullName, email, username, password].some((field) => field?.trim() === "") // Need to know about 'some' method
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
        throw new ApiError(409, "User with username and email Already Exists.")
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
        throw new ApiError(400, "Avatar file is Required.")
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
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "SomeThing went Wrong while registering the User.")
    }

    console.log(createdUser);
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully.")
    )
});

// LOGIN CONTROLLER :

const loginUser = asyncHandler(async (req, res) => {
    /* Get data from req.body  
    take email and password
    find the user
    check the password
    aaccess the refresh token
    send cookie
    */
    const { email, username, password } = req.body;
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required.");
    }

    // if (!(username || email)) {
    //     throw new ApiError(400, "Username or Password is required.");
    // }

    // User.findOne({email}) this also one case

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user Does not Exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password) // Returns trur or false

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user Credentials")
    }

    const { refreshToken, accessToken } = await generateAccessAndrefreshToken(user._id) // U'll get refresh and sccess token's

    /* Here we have two conditions i.e we can save directly the refresh tokens or we can make an another DB query amd store them in the DB , We need to decide which is better  */

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged In Successfully"
            )
        )
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // removes the field from the document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndrefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Pasword Changed Successfully.!"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user fetched successfully."))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Image Updated Successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Cover Imageg file is required.")
    }

    const coverImage = await uploadOnCloudinary(avatarLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading the Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image Updated Successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username not found")
    }

    const channel = User.aggregate([
        {
            $match: {// matching the username from the user DB and 
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: { // looking for the subscribers user
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: { // looking for the subscribed users 
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: { // counting the sbscribers || subscribed count
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: { // Sending { true || false } frontend to show wheather subscribe or subscribed
                    $condition: {
                        if: { $in: [req.user?._id, "$subscribers.subscribed"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            // used to show only required values not all the values to frontend
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])

    console.log(channel);

    if (!channel?.length) {
        throw new ApiError(400, "Cannel does not exists")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel Fetched Successfull"))

})

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {
            $match: {
                // _id: req.user._id we cant use this bcoz this may cause problems on aggregation pipelines 
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    { // To send clean and clear data to frontend bcoz it returns array of objects nad to make it clean we are using $addFields .
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
        {

        }
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History Fetched Successfully")
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}