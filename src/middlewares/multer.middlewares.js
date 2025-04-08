import multer from "multer";

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },

    filename: function (req, file, cb) {
        // const mid_name = Date.now() + "-" + Math.floor(Math.random() * 1000)
        // const file_extension = file.extname

        // cb(null, file.originalname + mid_name + file_extension)
        cb(null, file.originalname)

    }
})


export const upload = multer({
    storage
})