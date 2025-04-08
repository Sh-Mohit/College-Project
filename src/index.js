import connectDB from "./db/index.js";
import dotenv from "dotenv";
import { server } from "./app.js";

dotenv.config({
    path : "./.env"
})

const PORT = process.env.PORT || 8001

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server started on port : ${PORT}`);
            
        })
    })
    .catch((err) => {
        console.log(`MongoDB connection error`, err);
        process.exit(1)
    })