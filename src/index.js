import connectDB from "./db/index.js";
import dotenv from 'dotenv';
import { app } from "./app.js";

// PORT = process.env.PORT || 8000

dotenv.config({
    path: './env'
})

connectDB() 
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running on port ${process.env.PORT}`);
        })
    })
    .catch((err) => [
        console.log("MONGO_DB Connection Failed",err),
    ])





/*
import express from "express"
const app = express()
( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error)
        throw err
    }
})()
*/