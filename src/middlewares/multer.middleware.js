import multer from "multer";
// Read the documentaion from https://github.com/expressjs/multer

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "../../public/temp");
    },
    filename: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9); We can add theis later for the detailed understanding of the file upload We are adding it later.
        // cb(null, file.fieldname + "-" + uniqueSuffix); Just for now we are not using this function we are adding it later.
        cb(null, file.originalname); // The file will not be available so it is oki if we get more than one file with same name.
    },
});

export const upload = multer({
    storage,
});