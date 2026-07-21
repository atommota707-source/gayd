import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../../data/uploads');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_CLOUD_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'application/json'
];

function createStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, join(UPLOADS_DIR, subfolder));
    },
    filename: (req, file, cb) => {
      const ext = file.originalname.split('.').pop();
      cb(null, `${uuidv4()}.${ext}`);
    }
  });
}

function fileFilter(allowedTypes) {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  };
}

export const imageUpload = multer({
  storage: createStorage('images'),
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const cloudUpload = multer({
  storage: createStorage('cloud'),
  fileFilter: fileFilter(ALLOWED_CLOUD_TYPES),
  limits: { fileSize: 50 * 1024 * 1024 }
});
