const multer = require('multer');
const masterImportService = require('../services/masterImport.service');

// Konfigurasi Multer (simpan di memori buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Maksimal 10MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Format berkas harus berupa spreadsheet Excel (.xlsx)'));
    }
  },
});

const importItems = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Berkas Excel (.xlsx) wajib diunggah' });
    }

    const dryRun = req.query.dry_run === 'true' || req.body.dry_run === 'true';
    const result = await masterImportService.importItems(req.file.buffer, req.file.originalname, {
      dry_run: dryRun,
      actorId: req.user.id,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const importCoas = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Berkas Excel (.xlsx) wajib diunggah' });
    }

    const dryRun = req.query.dry_run === 'true' || req.body.dry_run === 'true';
    const result = await masterImportService.importCoas(req.file.buffer, req.file.originalname, {
      dry_run: dryRun,
      actorId: req.user.id,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  upload,
  importItems,
  importCoas,
};

