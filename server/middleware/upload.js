import multer from "multer";

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF attachments are allowed."));
  }
  cb(null, true);
}

export const uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
