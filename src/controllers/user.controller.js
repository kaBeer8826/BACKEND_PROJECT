import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiErrors.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
const generateAccessAndRefreshToken =async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken =  refreshToken
        await user.save({validateBeforeSave : false})
        return{accessToken,refreshToken}
    } catch (error) {
        throw new ApiError (500, "something went wrong:  token generation")
    }
}
const registerUser = asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation
    //check is user already exist
    //check for images, check for avatar
    // upload them to cloudinary,avatar
    //create user object - create entry in db
    //remove password and refersh token field from response
    //check for user creation
    //return the response

    const {fullName, email, username, password}=req.body
    console.log("email:", email)

    if(
        [fullName,email,username,password].some((field)=>
            field?.trim() === ""
        )
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){throw new ApiError(409 ,"user already exist")}
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log("image")
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400 ,"Avatar is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400 ,"Avatar is required")
    }

    const user = await User.create({
        fullName,
        email,
        username:username,
        password,
        avatar:avatar.url,
        coverImage:coverImage?.url || ""
    })    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "something went wrong- user creation")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered")
    )
})


const loginUser = asyncHandler(async(req,res)=>{
    //req body /check the usenam or email //find the user //password check //accec and refresh token
    //send cookies
    const {username,email, password} = req.body
    if(!username || !email){
        throw ApiError(400,"username or email is required");
    }
    const user = await User.findOne({$or:[{username},{email}]})
    if(!user){throw ApiError(404,"user doesn't exist")}

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){throw ApiError(401,"password is incorrect")}

    const {accessToken,refreshToken} =await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options ={
        httpOnly :true,
        secure : true
    }
    return res.status(200)
    .cookie("acessToken",accessToken,options)
    .cookie("refreshToken", refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged In"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
     await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken :undefined
            }
        },
        {
            new :true
        }
     )
     const options ={
        httpOnly :true,
        secure : true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, "User Loggedout successfully"))
})
export {registerUser,loginUser,logoutUser}
