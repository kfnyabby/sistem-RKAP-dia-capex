const db = require('../../db');
const newItemRequestRepository = require('../repositories/newItemRequest.repository');
const budgetDocRepository = require('../repositories/budgetDoc.repository');
const itemRepository = require('../repositories/item.repository');
const coaRepository = require('../repositories/coa.repository');
const expenseLineRepository = require('../repositories/expenseLine.repository');
const notificationRepository = require('../repositories/notification.repository');
const AuditService = require('./audit.service');
const submissionAccessService = require('./submissionAccess.service');

const getRequestsByDocId = async (docId, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Dokumen anggaran tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }
  return await newItemRequestRepository.findByDocId(docId, user);
};

const createDraftRequest = async (docId, payload, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Dokumen anggaran tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  // Validasi akses efektif pengisian terbuka (BR-10)
  await submissionAccessService.assertSubmissionOpen(doc);

  if (doc.status !== 'DRAFT') {
    const error = new Error('Permintaan barang baru hanya dapat ditambahkan saat dokumen berstatus DRAFT');
    error.statusCode = 400;
    throw error;
  }

  const { name, spec, uom, qty, est_price, reason } = payload;
  if (!name || !name.trim()) {
    const error = new Error('Nama barang wajib diisi');
    error.statusCode = 400;
    throw error;
  }

  if (!uom || !uom.trim()) {
    const error = new Error('Satuan (UOM) wajib diisi');
    error.statusCode = 400;
    throw error;
  }

  const parsedQty = parseFloat(qty);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    const error = new Error('Jumlah (qty) harus lebih besar dari 0');
    error.statusCode = 400;
    throw error;
  }

  const parsedEstPrice = parseInt(est_price, 10);
  if (isNaN(parsedEstPrice) || parsedEstPrice < 0) {
    const error = new Error('Estimasi harga harus bernilai 0 atau lebih');
    error.statusCode = 400;
    throw error;
  }

  const amount = Math.round(parsedQty * parsedEstPrice);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const created = await newItemRequestRepository.create(
      {
        doc_id: doc.id,
        unit_id: doc.unit_id,
        name,
        spec,
        uom,
        qty: parsedQty,
        est_price: parsedEstPrice,
        amount,
        reason,
        created_by: user.id,
      },
      client
    );

    await AuditService.log(
      user.id,
      'new_item_requests',
      created.id,
      'CREATE_DRAFT',
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

const updateDraftRequest = async (id, payload, user) => {
  const reqItem = await newItemRequestRepository.findById(id, user);
  if (!reqItem) {
    const error = new Error('Permintaan barang baru tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  if (reqItem.status !== 'DRAFT') {
    const error = new Error(
      `Permintaan barang baru tidak dapat diubah karena sudah berstatus ${reqItem.status}`
    );
    error.statusCode = 403;
    throw error;
  }

  // Validasi akses efektif pengisian terbuka (BR-10)
  const docForAccessUpdate = await budgetDocRepository.findRawById(reqItem.doc_id);
  if (docForAccessUpdate) {
    await submissionAccessService.assertSubmissionOpen(docForAccessUpdate);
  }

  const updatedName = payload.name !== undefined ? payload.name : reqItem.name;
  if (payload.name !== undefined && (!payload.name || !payload.name.trim())) {
    const error = new Error('Nama barang tidak boleh kosong');
    error.statusCode = 400;
    throw error;
  }

  const updatedUom = payload.uom !== undefined ? payload.uom : reqItem.uom;
  if (payload.uom !== undefined && (!payload.uom || !payload.uom.trim())) {
    const error = new Error('Satuan (UOM) tidak boleh kosong');
    error.statusCode = 400;
    throw error;
  }

  const qty = payload.qty !== undefined ? parseFloat(payload.qty) : reqItem.qty;
  if (isNaN(qty) || qty <= 0) {
    const error = new Error('Jumlah (qty) harus lebih besar dari 0');
    error.statusCode = 400;
    throw error;
  }

  const estPrice =
    payload.est_price !== undefined ? parseInt(payload.est_price, 10) : reqItem.est_price;
  if (isNaN(estPrice) || estPrice < 0) {
    const error = new Error('Estimasi harga harus bernilai 0 atau lebih');
    error.statusCode = 400;
    throw error;
  }

  const amount = Math.round(qty * estPrice);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const updated = await newItemRequestRepository.update(
      id,
      {
        name: updatedName,
        spec: payload.spec !== undefined ? payload.spec : reqItem.spec,
        uom: updatedUom,
        qty,
        est_price: estPrice,
        amount,
        reason: payload.reason !== undefined ? payload.reason : reqItem.reason,
      },
      client
    );

    await AuditService.log(
      user.id,
      'new_item_requests',
      id,
      'UPDATE_DRAFT',
      reqItem,
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

const deleteDraftRequest = async (id, user) => {
  const reqItem = await newItemRequestRepository.findById(id, user);
  if (!reqItem) {
    const error = new Error('Permintaan barang baru tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  if (reqItem.status !== 'DRAFT') {
    const error = new Error(
      `Permintaan barang baru tidak dapat dihapus karena sudah berstatus ${reqItem.status}`
    );
    error.statusCode = 403;
    throw error;
  }

  // Validasi akses efektif pengisian terbuka (BR-10)
  const docForAccessDelete = await budgetDocRepository.findRawById(reqItem.doc_id);
  if (docForAccessDelete) {
    await submissionAccessService.assertSubmissionOpen(docForAccessDelete);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await newItemRequestRepository.deleteById(id, client);

    await AuditService.log(
      user.id,
      'new_item_requests',
      id,
      'DELETE_DRAFT',
      reqItem,
      null,
      client
    );

    await client.query('COMMIT');
    return { success: true, message: 'Permintaan barang baru berhasil dihapus' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const sendRequests = async (docId, requestIds = null, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Dokumen anggaran tidak ditemukan atau Anda tidak memiliki akses');
    error.statusCode = 404;
    throw error;
  }

  // Validasi akses efektif pengisian terbuka (BR-10)
  await submissionAccessService.assertSubmissionOpen(doc);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const sentRows = await newItemRequestRepository.sendByDocId(doc.id, requestIds, client);
    if (!sentRows || sentRows.length === 0) {
      const error = new Error(
        'Tidak ada permintaan barang baru berstatus DRAFT yang dapat dikirim'
      );
      error.statusCode = 400;
      throw error;
    }

    for (const row of sentRows) {
      await AuditService.log(
        user.id,
        'new_item_requests',
        row.id,
        'SEND_REQUEST',
        { status: 'DRAFT' },
        { status: 'MENUNGGU_COA' },
        client
      );
    }

    // Notifikasi ke seluruh staf Akuntansi
    await notificationRepository.notifyRole(
      'akuntansi',
      {
        title: 'Permintaan Barang Baru',
        body: `Unit ${doc.unit_name} mengirimkan ${sentRows.length} permintaan barang baru untuk penentuan COA`,
        link: '/proses/penentuan-coa',
        created_by: user.id,
      },
      client
    );

    await client.query('COMMIT');
    return {
      success: true,
      message: `${sentRows.length} permintaan barang baru berhasil dikirim ke Akuntansi`,
      data: sentRows,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getAccountingQueue = async (filters, user) => {
  if (user.role !== 'akuntansi') {
    const error = new Error(
      'Forbidden: Hanya Akuntansi yang dapat melihat antrean penentuan COA'
    );
    error.statusCode = 403;
    throw error;
  }

  return await newItemRequestRepository.getQueue(filters);
};

const assignCoa = async (id, payload, user) => {
  // BR-18: Hanya Akuntansi yang berwenang menentukan COA
  if (user.role !== 'akuntansi') {
    const error = new Error('Forbidden: Hanya Akuntansi yang berwenang menentukan COA barang baru');
    error.statusCode = 403;
    throw error;
  }

  const reqItem = await newItemRequestRepository.findById(id);
  if (!reqItem) {
    const error = new Error('Permintaan barang baru tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  if (reqItem.status === 'COA_DITENTUKAN') {
    const error = new Error('COA untuk permintaan barang ini sudah ditentukan sebelumnya');
    error.statusCode = 400;
    throw error;
  }

  const coaId = parseInt(payload.coa_id, 10);
  if (isNaN(coaId)) {
    const error = new Error('COA wajib dipilih');
    error.statusCode = 400;
    throw error;
  }

  const coa = await coaRepository.findById(coaId);
  if (!coa) {
    const error = new Error('COA yang dipilih tidak valid atau tidak ditemukan');
    error.statusCode = 400;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Tentukan kode barang unik
    let itemCode = payload.item_code ? payload.item_code.trim() : null;
    if (!itemCode) {
      itemCode = `BRG-${reqItem.id.toString().padStart(5, '0')}`;
    }

    // Pastikan kode unik
    let existingItem = await itemRepository.findByCode(itemCode, client);
    let counter = 1;
    let baseCode = itemCode;
    while (existingItem) {
      itemCode = `${baseCode}-${counter}`;
      existingItem = await itemRepository.findByCode(itemCode, client);
      counter++;
    }

    // 1. Buat item baru di master items
    const newItem = await itemRepository.upsertItem(
      {
        code: itemCode,
        name: reqItem.name,
        uom: reqItem.uom,
        coa_id: coa.id,
        is_active: true,
      },
      client
    );

    // 2. Set harga perusahaan di item_prices dan item_price_history
    const companyId = reqItem.company_id;
    const priceToSet =
      payload.price !== undefined ? parseInt(payload.price, 10) : reqItem.est_price;

    await itemRepository.upsertPrice(newItem.id, companyId, priceToSet, user.id, client);
    await itemRepository.recordPriceHistory(
      newItem.id,
      companyId,
      0,
      priceToSet,
      'manual',
      user.id,
      client
    );

    // 3. Integrasi Dokumen & Anggaran (BR-17)
    const docRes = await client.query('SELECT * FROM budget_docs WHERE id = $1', [reqItem.doc_id]);
    const doc = docRes.rows[0];
    let manualHandlingNote = null;
    let lineAddedToDoc = false;

    if (doc && doc.status === 'DRAFT') {
      const existingLine = await expenseLineRepository.findByDocAndItemId(
        doc.id,
        newItem.id,
        client
      );
      if (!existingLine) {
        const lineAmount = Math.round(Number(reqItem.qty) * Number(priceToSet));
        await expenseLineRepository.insertLine(
          {
            doc_id: doc.id,
            item_id: newItem.id,
            qty: reqItem.qty,
            price_snapshot: priceToSet,
            amount: lineAmount,
            note: reqItem.reason || `Dari permintaan barang baru #${reqItem.id}`,
            version: 1,
            created_by: user.id,
          },
          client
        );
        await budgetDocRepository.recalculateTotal(doc.id, client);
        lineAddedToDoc = true;
      }
    } else {
      manualHandlingNote = `Dokumen #${reqItem.doc_id} berstatus ${doc ? doc.status : 'TIDAK_DITEMUKAN'}. Baris biaya tidak dapat ditambahkan otomatis ke dokumen dan perlu ditangani manual.`;
    }

    // 4. Update status permintaan barang baru
    const updatedReq = await newItemRequestRepository.updateAssignedCoa(
      reqItem.id,
      {
        assigned_coa_id: coa.id,
        assigned_by: user.id,
        item_id: newItem.id,
        manual_handling_note: manualHandlingNote,
      },
      client
    );

    // 5. Notifikasi ke pembuat permintaan
    if (reqItem.created_by) {
      await notificationRepository.createNotification(
        {
          user_id: reqItem.created_by,
          title: `COA Ditentukan: ${reqItem.name}`,
          body: `Akuntansi telah menentukan COA (${coa.code} - ${coa.name}) untuk ${reqItem.name}.${lineAddedToDoc ? ' Baris biaya otomatis dimasukkan ke dokumen anggaran.' : ' Perlu penanganan manual pada dokumen.'}`,
          link: `/entry/biaya?doc_id=${reqItem.doc_id}`,
          created_by: user.id,
        },
        client
      );
    }

    // 6. Audit Trail
    await AuditService.log(
      user.id,
      'new_item_requests',
      reqItem.id,
      'ASSIGN_COA',
      reqItem,
      updatedReq,
      client
    );
    await AuditService.log(
      user.id,
      'items',
      newItem.id,
      'CREATE_FROM_REQUEST',
      null,
      newItem,
      client
    );

    await client.query('COMMIT');
    return {
      success: true,
      message: 'COA berhasil ditentukan dan barang baru telah ditambahkan ke master',
      data: {
        request: updatedReq,
        item: newItem,
        line_added_to_doc: lineAddedToDoc,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getRequestsByDocId,
  createDraftRequest,
  updateDraftRequest,
  deleteDraftRequest,
  sendRequests,
  getAccountingQueue,
  assignCoa,
};
