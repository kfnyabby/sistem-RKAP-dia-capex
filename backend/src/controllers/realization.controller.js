const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../../db');
const realizationImportService = require('../services/realizationImport.service');
const realizationQueryService = require('../services/realizationQuery.service');

const os = require('os');

// Pastikan folder uploads tersedia (gunakan /tmp di serverless Vercel)
const uploadsDir =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join(os.tmpdir(), 'uploads')
    : path.join(__dirname, '../../uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('[UPLOADS WARNING] Gagal membuat direktori uploads:', err.message);
}

// Konfigurasi Multer diskStorage (simpan ke disk, bukan memori)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.xlsx';
    cb(null, `jurnal-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // Maksimal 150MB
  fileFilter: (req, file, cb) => {
    const isXlsxExt = file.originalname && file.originalname.toLowerCase().endsWith('.xlsx');
    const isXlsxMime =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/octet-stream' ||
      !file.mimetype; // sebagian OS mengirim mime kosong

    if (isXlsxExt && isXlsxMime) {
      cb(null, true);
    } else {
      const err = new Error('Format file tidak didukung. Harap unggah file spreadsheet Excel (.xlsx).');
      err.status = 400;
      cb(err);
    }
  },
});

/**
 * Middleware wrapper untuk upload file agar galat ukuran file / format mengembalikan 400
 */
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Ukuran file melebihi batas maksimum 150MB.',
        });
      }
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || 'Gagal mengunggah file.',
      });
    }
    next();
  });
};

/**
 * POST /api/realization-imports
 */
const createImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File Excel daftar jurnal (.xlsx) wajib diunggah.',
      });
    }

    const companyCode = (req.body.company_code || 'CN').trim().toUpperCase();
    const mode = (req.body.mode || 'replace_month').trim();

    if (!['replace_month', 'append'].includes(mode)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Mode import tidak valid. Pilihan yang tersedia: 'replace_month' atau 'append'.",
      });
    }

    // Cari ID perusahaan
    const compRes = await db.query('SELECT id, code, name FROM companies WHERE code = $1', [
      companyCode,
    ]);
    if (compRes.rows.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Perusahaan dengan kode '${companyCode}' tidak ditemukan.`,
      });
    }
    const company = compRes.rows[0];

    // Buat batch import (memvalidasi header terlebih dahulu secara sinkron)
    const batch = await realizationImportService.createImportBatch({
      companyId: company.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      mode,
      userId: req.user.id,
    });

    // Jalankan pemrosesan streaming penuh di latar belakang
    const processPromise = realizationImportService.processRealizationFile(
      batch.id,
      req.file.path,
      req.user.id
    );

    // Jangan biarkan unhandled promise rejection
    processPromise.catch((err) => {
      console.error(`Error latar belakang proses realisasi batch ${batch.id}:`, err.message);
    });

    // Respons 202 Accepted
    return res.status(202).json({
      success: true,
      message: 'File daftar jurnal berhasil diterima dan sedang diproses di latar belakang.',
      data: {
        id: batch.id,
        batch_id: batch.id,
        company_code: company.code,
        file_name: batch.file_name,
        mode: batch.mode,
        status: batch.status,
      },
    });
  } catch (err) {
    // Jika validasi gagal, hapus file sementara
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
    }
    next(err);
  }
};

/**
 * GET /api/realization-imports
 */
const listImports = async (req, res, next) => {
  try {
    const result = await realizationImportService.listImportBatches(req.query);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/realization-imports/:id
 */
const getImportDetail = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const batch = await realizationImportService.getImportBatch(batchId);
    res.json({
      success: true,
      data: batch,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/realization-imports/:id/unmapped-units
 */
const getUnmappedUnits = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const unmapped = await realizationImportService.getUnmappedUnits(batchId);
    res.json({
      success: true,
      data: unmapped,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/realization-imports/:id/errors
 */
const getErrors = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const result = await realizationImportService.getBatchErrors(batchId, req.query);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/unit-aliases
 */
const updateUnitAlias = async (req, res, next) => {
  try {
    let { company_id, company_code, alias_name, unit_id } = req.body;

    if (!company_id && company_code) {
      const compRes = await db.query('SELECT id FROM companies WHERE code = $1', [
        company_code.trim().toUpperCase(),
      ]);
      if (compRes.rows.length > 0) {
        company_id = compRes.rows[0].id;
      }
    }

    if (!company_id || !alias_name || !unit_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter company_id (atau company_code), alias_name, dan unit_id wajib diisi.',
      });
    }

    const result = await realizationImportService.updateUnitAlias({
      companyId: parseInt(company_id, 10),
      aliasName: String(alias_name).trim(),
      unitId: parseInt(unit_id, 10),
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: `Alias unit '${alias_name}' berhasil disimpan dan diterapkan pada ${result.remapped_rows} baris jurnal.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/realization-imports/:id/confirm
 */
const confirmImport = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const updatedBatch = await realizationImportService.confirmImport(batchId, req.user.id);
    res.json({
      success: true,
      message: 'Batch import realisasi berhasil dikonfirmasi.',
      data: updatedBatch,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/realization-imports/:id
 */
const rollbackImport = async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const rolledBackBatch = await realizationImportService.rollbackImport(batchId, req.user.id);
    res.json({
      success: true,
      message: 'Batch import realisasi berhasil dibatalkan (rollback).',
      data: rolledBackBatch,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/realizations
 */
const getRealizations = async (req, res, next) => {
  try {
    const data = await realizationQueryService.getRealizations(req.query, req.user);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadMiddleware,
  createImport,
  listImports,
  getImportDetail,
  getUnmappedUnits,
  getErrors,
  updateUnitAlias,
  confirmImport,
  rollbackImport,
  getRealizations,
};
