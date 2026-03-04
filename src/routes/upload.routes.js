// src/routes/upload.routes.js — File upload endpoint (images + PDFs)
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Sub-folder by document type (optional query param)
        const subDir = req.query.type || 'general';
        const targetDir = path.join(uploadDir, subDir);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// File filter: allow images + PDF
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('ອະນຸຍາດສະເພາະ ຮູບ (JPG, PNG, WEBP) ແລະ PDF ເທົ່ານັ້ນ'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/uploads — single file
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: false, message: 'ບໍ່ມີ file' });
    }

    // Build relative URL path
    const relativePath = `/uploads/${req.query.type || 'general'}/${req.file.filename}`;

    res.json({
        status: true,
        message: 'Upload ສຳເລັດ',
        data: {
            url: relativePath,
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        },
    });
});

// POST /api/uploads/multiple — multiple files
router.post('/multiple', upload.array('files', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ status: false, message: 'ບໍ່ມີ files' });
    }

    const files = req.files.map((f) => ({
        url: `/uploads/${req.query.type || 'general'}/${f.filename}`,
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
    }));

    res.json({ status: true, message: 'Upload ສຳເລັດ', data: files });
});

module.exports = router;
