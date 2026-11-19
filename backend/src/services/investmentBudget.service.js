const db = require('../../db');
const investmentLineRepository = require('../repositories/investmentLine.repository');
const budgetDocRepository = require('../repositories/budgetDoc.repository');
const investmentCategoryRepository = require('../repositories/investmentCategory.repository');
const settingRepository = require('../repositories/setting.repository');
const AuditService = require('./audit.service');
const submissionAccessService = require('./submissionAccess.service');

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

const listInvestmentLines = async (docId, filters = {}, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Dokumen anggaran tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  const linesResult = await investmentLineRepository.findByDocId(docId, filters, user);
  const summary = await budgetDocRepository.getInvestmentSummary(docId);

  return {
    ...linesResult,
    summary,
    doc,
  };
};

const createInvestmentLine = async (docId, payload, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Dokumen anggaran tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  // Validasi akses efektif pengisian terbuka (BR-10)
  await submissionAccessService.assertSubmissionOpen(doc);

  if (doc.status !== 'DRAFT' && doc.status !== 'DIKEMBALIKAN') {
    const error = new Error('Baris investasi hanya dapat ditambahkan saat dokumen berstatus DRAFT atau DIKEMBALIKAN');
    error.statusCode = 400;
    throw error;
  }

  const categoryId = parseInt(payload.category_id, 10);
  if (isNaN(categoryId)) {
    const error = new Error('Kategori investasi wajib dipilih');
    error.statusCode = 400;
    throw error;
  }

  const category = await investmentCategoryRepository.findById(categoryId);
  if (!category) {
    const error = new Error('Kategori investasi yang dipilih tidak valid');
    error.statusCode = 400;
    throw error;
  }

  const name = payload.name ? payload.name.trim() : '';
  if (!name) {
    const error = new Error('Nama barang atau kegiatan investasi wajib diisi');
    error.statusCode = 400;
    throw error;
  }

  const qty = parseInt(payload.qty, 10);
  if (isNaN(qty) || qty < 1) {
    const error = new Error('Jumlah (qty) harus minimal 1');
    error.statusCode = 400;
    throw error;
  }

  const price = parseInt(payload.price, 10);
  if (isNaN(price) || price < 0) {
    const error = new Error('Harga satuan harus bernilai 0 atau lebih');
    error.statusCode = 400;
    throw error;
  }

  const amount = Math.round(qty * price);

  const planMonth = parseInt(payload.plan_month || 1, 10);
  if (isNaN(planMonth) || planMonth < 1 || planMonth > 12) {
    const error = new Error('Bulan rencana harus berada di antara 1 (Januari) sampai 12 (Desember)');
    error.statusCode = 400;
    throw error;
  }

  const priorityId = parseInt(payload.priority_id, 10);
  if (isNaN(priorityId)) {
    const error = new Error('Prioritas wajib dipilih');
    error.statusCode = 400;
    throw error;
  }

  // 1. Validasi Ambang Investasi BR-01
  const rawThreshold = await settingRepository.getSetting('investment_threshold', 5000000);
  const threshold = parseInt(rawThreshold, 10);

  let basis = await settingRepository.getSetting('investment_threshold_basis', 'unit_price');
  if (typeof basis === 'string') {
    basis = basis.replace(/^"|"$/g, '');
  }

  const evaluationValue = basis === 'line_total' ? amount : price;
  if (evaluationValue <= threshold) {
    const basisLabel = basis === 'line_total' ? 'Total nilai baris' : 'Harga satuan';
    const error = new Error(
      `Nilai investasi (${basisLabel}: Rp ${formatRupiah(evaluationValue)}) harus lebih besar dari ambang batas Rp ${formatRupiah(threshold)} (BR-01). Item dengan nilai sampai ambang batas dimasukkan ke Anggaran Biaya.`
    );
    error.statusCode = 422;
    throw error;
  }

  // 2. Validasi Batas Maksimal 4 Kotak Teks
  const rawMaxLen = await settingRepository.getSetting('investment_text_max_length', 300);
  const maxLen = parseInt(rawMaxLen, 10);

  const textFields = [
    { key: 'strategic_objective', label: 'Strategi Objektif', val: payload.strategic_objective },
    { key: 'kpi', label: 'Counter Measure (KPI)', val: payload.kpi },
    { key: 'work_program', label: 'Program Kerja / Inisiatif Strategis', val: payload.work_program },
    { key: 'strategic_action', label: 'Strategic Action', val: payload.strategic_action },
  ];

  for (const field of textFields) {
    if (field.val && field.val.trim().length > maxLen) {
      const error = new Error(
        `Isian ${field.label} melebihi batas maksimum ${maxLen} karakter (saat ini ${field.val.trim().length} karakter).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Otomasi COA & Masa Manfaat (BR-15)
  const usefulLifeMonths = parseInt(category.useful_life_months || 0, 10);
  const coaId = category.depreciation_coa_id || null;

  // 4. Formula Penyusutan Otomatis (BR-16)
  let depreciationAmount = 0;
  if (usefulLifeMonths > 0 && planMonth >= 1 && planMonth <= 12) {
    const remainingMonths = Math.max(0, 12 - planMonth);
    depreciationAmount = Math.round((Number(amount) / usefulLifeMonths) * remainingMonths);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const created = await investmentLineRepository.create(
      {
        doc_id: doc.id,
        category_id: category.id,
        priority_id: priorityId,
        coa_id: coaId,
        name,
        qty,
        price,
        amount,
        plan_month: planMonth,
        useful_life_months: usefulLifeMonths,
        depreciation_amount: depreciationAmount,
        strategic_objective: payload.strategic_objective,
        kpi: payload.kpi,
        work_program: payload.work_program,
        strategic_action: payload.strategic_action,
        note: payload.note,
        created_by: user.id,
      },
      client
    );

    // Rekalkulasi total dokumen
    await budgetDocRepository.recalculateTotal(doc.id, client);

    // Audit Trail
    await AuditService.log(
      user.id,
      'investment_lines',
      created.id,
      'CREATE_LINE',
      null,
      created,
      client
    );

    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateInvestmentLine = async (lineId, payload, user) => {
  const currentLine = await investmentLineRepository.findById(lineId, user);
  if (!currentLine) {
    const error = new Error('Baris investasi tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  // Validasi akses efektif pengisian terbuka (BR-10)
  const docForAccess = await budgetDocRepository.findRawById(currentLine.doc_id);
  if (docForAccess) {
    await submissionAccessService.assertSubmissionOpen(docForAccess);
  }

  if (currentLine.doc_status !== 'DRAFT' && currentLine.doc_status !== 'DIKEMBALIKAN') {
    const error = new Error(
      `Baris investasi tidak dapat diubah karena dokumen berstatus ${currentLine.doc_status}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Optimistic locking (bentrok versi)
  if (payload.version !== undefined && parseInt(payload.version, 10) !== currentLine.version) {
    const error = new Error(
      'Baris investasi telah diubah oleh pengguna lain. Silakan muat ulang data terbaru.'
    );
    error.statusCode = 409;
    throw error;
  }

  const categoryId =
    payload.category_id !== undefined
      ? parseInt(payload.category_id, 10)
      : currentLine.category_id;
  const category = await investmentCategoryRepository.findById(categoryId);
  if (!category) {
    const error = new Error('Kategori investasi yang dipilih tidak valid');
    error.statusCode = 400;
    throw error;
  }

  const name =
    payload.name !== undefined ? (payload.name ? payload.name.trim() : '') : currentLine.name;
  if (!name) {
    const error = new Error('Nama barang atau kegiatan investasi tidak boleh kosong');
    error.statusCode = 400;
    throw error;
  }

  const qty =
    payload.qty !== undefined ? parseInt(payload.qty, 10) : currentLine.qty;
  if (isNaN(qty) || qty < 1) {
    const error = new Error('Jumlah (qty) harus minimal 1');
    error.statusCode = 400;
    throw error;
  }

  const price =
    payload.price !== undefined ? parseInt(payload.price, 10) : currentLine.price;
  if (isNaN(price) || price < 0) {
    const error = new Error('Harga satuan harus bernilai 0 atau lebih');
    error.statusCode = 400;
    throw error;
  }

  const amount = Math.round(qty * price);

  const planMonth =
    payload.plan_month !== undefined
      ? parseInt(payload.plan_month, 10)
      : currentLine.plan_month;
  if (isNaN(planMonth) || planMonth < 1 || planMonth > 12) {
    const error = new Error('Bulan rencana harus berada di antara 1 (Januari) sampai 12 (Desember)');
    error.statusCode = 400;
    throw error;
  }

  const priorityId =
    payload.priority_id !== undefined
      ? parseInt(payload.priority_id, 10)
      : currentLine.priority_id;

  // 1. Validasi Ambang Investasi BR-01
  const rawThreshold = await settingRepository.getSetting('investment_threshold', 5000000);
  const threshold = parseInt(rawThreshold, 10);

  let basis = await settingRepository.getSetting('investment_threshold_basis', 'unit_price');
  if (typeof basis === 'string') {
    basis = basis.replace(/^"|"$/g, '');
  }

  const evaluationValue = basis === 'line_total' ? amount : price;
  if (evaluationValue <= threshold) {
    const basisLabel = basis === 'line_total' ? 'Total nilai baris' : 'Harga satuan';
    const error = new Error(
      `Nilai investasi (${basisLabel}: Rp ${formatRupiah(evaluationValue)}) harus lebih besar dari ambang batas Rp ${formatRupiah(threshold)} (BR-01). Item dengan nilai sampai ambang batas dimasukkan ke Anggaran Biaya.`
    );
    error.statusCode = 422;
    throw error;
  }

  // 2. Validasi Batas Maksimal 4 Kotak Teks
  const rawMaxLen = await settingRepository.getSetting('investment_text_max_length', 300);
  const maxLen = parseInt(rawMaxLen, 10);

  const textFields = [
    {
      key: 'strategic_objective',
      label: 'Strategi Objektif',
      val: payload.strategic_objective !== undefined ? payload.strategic_objective : currentLine.strategic_objective,
    },
    {
      key: 'kpi',
      label: 'Counter Measure (KPI)',
      val: payload.kpi !== undefined ? payload.kpi : currentLine.kpi,
    },
    {
      key: 'work_program',
      label: 'Program Kerja / Inisiatif Strategis',
      val: payload.work_program !== undefined ? payload.work_program : currentLine.work_program,
    },
    {
      key: 'strategic_action',
      label: 'Strategic Action',
      val: payload.strategic_action !== undefined ? payload.strategic_action : currentLine.strategic_action,
    },
  ];

  for (const field of textFields) {
    if (field.val && field.val.trim().length > maxLen) {
      const error = new Error(
        `Isian ${field.label} melebihi batas maksimum ${maxLen} karakter (saat ini ${field.val.trim().length} karakter).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Otomasi COA & Masa Manfaat (BR-15)
  const usefulLifeMonths = parseInt(category.useful_life_months || 0, 10);
  const coaId = category.depreciation_coa_id || null;

  // 4. Formula Penyusutan Otomatis (BR-16)
  let depreciationAmount = 0;
  if (usefulLifeMonths > 0 && planMonth >= 1 && planMonth <= 12) {
    const remainingMonths = Math.max(0, 12 - planMonth);
    depreciationAmount = Math.round((Number(amount) / usefulLifeMonths) * remainingMonths);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await investmentLineRepository.update(
      lineId,
      {
        category_id: category.id,
        priority_id: priorityId,
        coa_id: coaId,
        name,
        qty,
        price,
        amount,
        plan_month: planMonth,
        useful_life_months: usefulLifeMonths,
        depreciation_amount: depreciationAmount,
        strategic_objective: payload.strategic_objective,
        kpi: payload.kpi,
        work_program: payload.work_program,
        strategic_action: payload.strategic_action,
        note: payload.note,
      },
      client
    );

    // Rekalkulasi total dokumen
    await budgetDocRepository.recalculateTotal(currentLine.doc_id, client);

    // Audit Trail
    await AuditService.log(
      user.id,
      'investment_lines',
      lineId,
      'UPDATE_LINE',
      currentLine,
      updated,
      client
    );

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const deleteInvestmentLine = async (lineId, user) => {
  const currentLine = await investmentLineRepository.findById(lineId, user);
  if (!currentLine) {
    const error = new Error('Baris investasi tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  // Validasi akses efektif pengisian terbuka (BR-10)
  const docForAccessDelete = await budgetDocRepository.findRawById(currentLine.doc_id);
  if (docForAccessDelete) {
    await submissionAccessService.assertSubmissionOpen(docForAccessDelete);
  }

  if (currentLine.doc_status !== 'DRAFT' && currentLine.doc_status !== 'DIKEMBALIKAN') {
    const error = new Error(
      `Baris investasi tidak dapat dihapus karena dokumen berstatus ${currentLine.doc_status}`
    );
    error.statusCode = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await investmentLineRepository.deleteById(lineId, client);

    // Rekalkulasi total dokumen
    await budgetDocRepository.recalculateTotal(currentLine.doc_id, client);

    // Audit Trail
    await AuditService.log(
      user.id,
      'investment_lines',
      lineId,
      'DELETE_LINE',
      currentLine,
      null,
      client
    );

    await client.query('COMMIT');
    return {
      success: true,
      message: 'Baris investasi berhasil dihapus',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getSuggestions = async (docId, field, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Dokumen anggaran tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  return await investmentLineRepository.getSuggestions(docId, field, user);
};

const getLastLineText = async (docId, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Dokumen anggaran tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  return await investmentLineRepository.getLastLineByDocId(docId);
};

const listLaptopPcCrossUnit = async (filters = {}, user) => {
  // Hanya Akuntansi dan Manager yang berwenang
  if (user.role !== 'akuntansi' && user.role !== 'manager') {
    const error = new Error(
      'Forbidden: Hanya Akuntansi dan Manager yang berwenang melihat daftar Laptop & PC lintas unit'
    );
    error.statusCode = 403;
    throw error;
  }

  return await investmentLineRepository.findAllCrossUnit(filters, user);
};

module.exports = {
  listInvestmentLines,
  createInvestmentLine,
  updateInvestmentLine,
  deleteInvestmentLine,
  getSuggestions,
  getLastLineText,
  listLaptopPcCrossUnit,
};
