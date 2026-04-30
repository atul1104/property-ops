const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(Object.assign(new Error('Only PDF files are accepted'), { status: 400 }));
    }
    cb(null, true);
  },
});

module.exports = upload;
