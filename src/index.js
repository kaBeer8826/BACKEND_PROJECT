import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'

dotenv.config({
    path: './env'
})
connectDB().then(()=>{
    console.log("mongo db is connected")
})
.then(()=>{
    
    app.listen(8000 ,(res,req)=>{
        console.log(`server is running at port :${process.env.PORT}` )
        
    })
})
.catch((err)=>{
    console.log("Mongo db error : connection failed (express file)",err)
})