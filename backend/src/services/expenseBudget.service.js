const db = require('../../db');
const budgetDocRepository = require('../repositories/budgetDoc.repository');
const expenseLineRepository = require('../repositories/expenseLine.repository');
const itemRepository = require('../repositories/item.repository');
const AuditService = require('./audit.service');

const listDocs = async (filters, user) => {
  return await budgetDocRepository.findAll(filters, user);
};

const getDocDetail = async (docId, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Akses ditolak: Anda tidak memiliki akses ke dokumen unit ini');
    error.status = 403;
    throw error;
  }

  const totalsByCoa = await budgetDocRepository.getTotalsByCoa(docId);

  return {
    ...doc,
    totals_by_coa: totalsByCoa,
  };
};

const createDoc = async (data, user) => {
  const { period_id, unit_id, type = 'BIAYA' } = data;

  // Cek wewenang unit jika bukan akuntansi
  if (user.role !== 'akuntansi') {
    const accessibleUnitIds = await budgetDocRepository.getAccessibleUnitIds(user);
    if (!accessibleUnitIds.includes(parseInt(unit_id, 10))) {
      const error = new Error('Akses ditolak: Anda tidak ditugaskan pada unit ini');
      error.status = 403;
      throw error;
    }
  }

  // Cek apakah dokumen sudah ada untuk (period, unit, type)
  const existing = await budgetDocRepository.findByUnitPeriodType(period_id, unit_id, type);
  if (existing) {
    const error = new Error('Dokumen untuk unit, periode, dan jenis ini sudah ada');
    error.status = 409;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const newDoc = await budgetDocRepository.create(
      {
        period_id: parseInt(period_id, 10),
        unit_id: parseInt(unit_id, 10),
        type,
        status: 'DRAFT',
        total_amount: 0,
        version: 1,
        created_by: user.id,
      },
      client
    );

    await AuditService.log(
      user.id,
      'budget_docs',
      newDoc.id,
      'CREATE_BUDGET_DOC',
      null,
      {
        doc_id: newDoc.id,
        period_id: newDoc.period_id,
        unit_id: newDoc.unit_id,
        type: newDoc.type,
        status: newDoc.status,
      },
      client
    );

    await client.query('COMMIT');

    return {
      doc_id: newDoc.id,
      status: newDoc.status,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const listExpenseLines = async (docId, filters, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Akses ditolak: Anda tidak memiliki akses ke dokumen unit ini');
    error.status = 403;
    throw error;
  }

  return await expenseLineRepository.findByDocId(docId, filters);
};

const saveExpenseLines = async (docId, lines, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Akses ditolak: Anda tidak memiliki akses ke dokumen unit ini');
    error.status = 403;
    throw error;
  }

  if (doc.status !== 'DRAFT') {
    const error = new Error(`Dokumen tidak dapat diubah pada status ${doc.status}`);
    error.status = 403;
    throw error;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let savedCount = 0;

    for (const line of lines) {
      let existingLine = null;
      if (line.id) {
        existingLine = await expenseLineRepository.findById(line.id, client);
      } else {
        existingLine = await expenseLineRepository.findByDocAndItemId(docId, line.item_id, client);
      }

      if (existingLine) {
        // 1. Optimistic Locking (Bentrok Versi)
        if (
          line.version !== undefined &&
          line.version !== null &&
          parseInt(line.version, 10) !== parseInt(existingLine.version, 10)
        ) {
          const itemRes = await client.query('SELECT name FROM items WHERE id = $1', [
            existingLine.item_id,
          ]);
          const itemName = itemRes.rows[0]?.name || 'Barang';
          const err = new Error(
            `Baris '${itemName}' telah diubah oleh sesi lain. Harap muat ulang data terbaru.`
          );
          err.status = 409;
          throw err;
        }

        // 2. Snapshot harga immutability (BR-03)
        let priceSnapshot = parseInt(existingLine.price_snapshot, 10);
        if (priceSnapshot <= 0) {
          // Fallback bila saat pertama tersimpan harga bernilai 0
          const masterPrice = await expenseLineRepository.getItemMasterPrice(
            existingLine.item_id,
            doc.company_id,
            doc.period_id,
            client
          );
          if (masterPrice === null || masterPrice <= 0) {
            const itemRes = await client.query('SELECT name FROM items WHERE id = $1', [
              existingLine.item_id,
            ]);
            const itemName = itemRes.rows[0]?.name || 'Barang';
            const err = new Error(
              `Barang '${itemName}' belum memiliki harga pada periode ini`
            );
            err.status = 422;
            throw err;
          }
          priceSnapshot = masterPrice;
        }

        const qty = parseInt(line.qty, 10);
        const amount = priceSnapshot * qty;
        const newVersion = parseInt(existingLine.version, 10) + 1;

        await expenseLineRepository.updateLine(
          existingLine.id,
          {
            qty,
            price_snapshot: priceSnapshot,
            amount,
            note: line.note !== undefined ? line.note : existingLine.note,
            version: newVersion,
          },
          client
        );
        savedCount++;
      } else {
        // Baris baru ditambahkan ke dokumen
        // Cek harga master pada periode dan perusahaan terkait
        const masterPrice = await expenseLineRepository.getItemMasterPrice(
          line.item_id,
          doc.company_id,
          doc.period_id,
          client
        );

        if (masterPrice === null || masterPrice <= 0) {
          const itemRes = await client.query('SELECT name FROM items WHERE id = $1', [
            line.item_id,
          ]);
          const itemName = itemRes.rows[0]?.name || `Item #${line.item_id}`;
          const err = new Error(
            `Barang '${itemName}' belum memiliki harga pada periode ini`
          );
          err.status = 422;
          throw err;
        }

        const qty = parseInt(line.qty, 10);
        const amount = masterPrice * qty;

        await expenseLineRepository.insertLine(
          {
            doc_id: parseInt(docId, 10),
            item_id: parseInt(line.item_id, 10),
            qty,
            price_snapshot: masterPrice,
            amount,
            note: line.note || null,
            version: 1,
            created_by: user.id,
          },
          client
        );
        savedCount++;
      }
    }

    // Rekalkulasi total dokumen secara atomis
    const updatedDoc = await budgetDocRepository.recalculateTotal(docId, client);

    await AuditService.log(
      user.id,
      'expense_lines',
      parseInt(docId, 10),
      'SAVE_EXPENSE_LINES',
      null,
      {
        doc_id: parseInt(docId, 10),
        saved_lines: savedCount,
        total_amount: parseInt(updatedDoc.total_amount, 10),
      },
      client
    );

    await client.query('COMMIT');

    return {
      doc_id: parseInt(docId, 10),
      saved: savedCount,
      total_amount: parseInt(updatedDoc.total_amount, 10),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const deleteExpenseLine = async (lineId, user) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const line = await expenseLineRepository.findById(lineId, client);
    if (!line) {
      const error = new Error('Baris anggaran tidak ditemukan');
      error.status = 404;
      throw error;
    }

    // Otorisasi unit
    if (user.role !== 'akuntansi') {
      const accessibleUnitIds = await budgetDocRepository.getAccessibleUnitIds(user);
      if (!accessibleUnitIds.includes(parseInt(line.unit_id, 10))) {
        const error = new Error('Akses ditolak: Anda tidak memiliki akses ke dokumen unit ini');
        error.status = 403;
        throw error;
      }
    }

    if (line.doc_status !== 'DRAFT') {
      const error = new Error(`Dokumen tidak dapat diubah pada status ${line.doc_status}`);
      error.status = 403;
      throw error;
    }

    await expenseLineRepository.deleteById(lineId, client);

    const updatedDoc = await budgetDocRepository.recalculateTotal(line.doc_id, client);

    await AuditService.log(
      user.id,
      'expense_lines',
      parseInt(lineId, 10),
      'DELETE_EXPENSE_LINE',
      {
        doc_id: line.doc_id,
        item_id: line.item_id,
        item_name: line.item_name,
        qty: line.qty,
        amount: line.amount,
      },
      {
        total_amount_after: parseInt(updatedDoc.total_amount, 10),
      },
      client
    );

    await client.query('COMMIT');

    return {
      message: 'Line deleted',
      total_amount: parseInt(updatedDoc.total_amount, 10),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getAvailableItemsForDoc = async (docId, params, user) => {
  const doc = await budgetDocRepository.findById(docId, user);
  if (!doc) {
    const error = new Error('Akses ditolak: Anda tidak memiliki akses ke dokumen unit ini');
    error.status = 403;
    throw error;
  }

  return await itemRepository.getAvailableForDoc(
    docId,
    doc.company_id,
    doc.period_id,
    params
  );
};

module.exports = {
  listDocs,
  getDocDetail,
  createDoc,
  listExpenseLines,
  saveExpenseLines,
  deleteExpenseLine,
  getAvailableItemsForDoc,
};

