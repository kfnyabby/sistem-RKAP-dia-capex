const multer = require('multer');
const masterImportService = require('../services/masterImport.service');
const unitImportService = require('../services/unitImport.service');

// Konfigurasi Multer (simpan di memori buffer, khusus .xlsx maksimal 15MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Maksimal 15MB
  fileFilter: (req, file, cb) => {
    const isXlsxExt = file.originalname && file.originalname.toLowerCase().endsWith('.xlsx');
    const isXlsxMime =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/octet-stream';

    if (isXlsxExt && isXlsxMime) {
      cb(null, true);
    } else {
      const err = new Error('Format berkas harus berupa spreadsheet Excel (.xlsx)');
      err.status = 400;
      err.code = 'INVALID_FILE_TYPE';
      cb(err);
    }
  },
});

const importItems = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Berkas Excel (.xlsx) wajib diunggah' });
    }

    const dryRun = req.query.dry_run === 'true' || req.body.dry_run === 'true';
    const companyCode = req.query.company_code || req.body.company_code || 'CN';
    const updatePrices = req.query.update_prices === 'true' || req.body.update_prices === 'true';

    const result = await masterImportService.importItems(req.file.buffer, req.file.originalname, {
      dry_run: dryRun,
      actorId: req.user.id,
      company_code: companyCode,
      update_prices: updatePrices,
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

const importUnits = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Berkas Excel (.xlsx) wajib diunggah' });
    }

    const dryRun = req.query.dry_run === 'true' || req.body.dry_run === 'true';
    const result = await unitImportService.importMasterUnits(
      req.file.buffer,
      req.file.originalname,
      dryRun,
      req.user
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  upload,
  importItems,
  importCoas,
  importUnits,
};
