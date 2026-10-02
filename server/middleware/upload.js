import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "application/octet-stream",
]);

function looksLikePdf(file) {
  const mime = (file?.mimetype || "").toLowerCase().trim();
  const original = (file?.originalname || "").toLowerCase().trim();

  if (ALLOWED_PDF_MIME_TYPES.has(mime)) {
    return original.endsWith(".pdf") || mime.includes("pdf") || mime === "application/octet-stream";
  }

  if (mime.includes("pdf")) {
    return true;
  }

  return original.endsWith(".pdf");
}

function fileFilter(req, file, cb) {
  if (!looksLikePdf(file)) {
    return cb(new Error("Only PDF attachments are allowed."));
  }
  cb(null, true);
}

export const uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
