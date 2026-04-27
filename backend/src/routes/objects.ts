import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader, Pool } from 'mysql2/promise';
import multer from 'multer';
import { RealEstateObject, PaymentRecord } from '../types';
import { generateId, getUploadsDir } from '../utils';
import { rowToPaymentRecord, rowToDocument, rowToObject, groupByObjectId } from '../mappers';
import { logError } from '../logger';

const router = Router();

// multer uses a static path — directory guaranteed to exist by index.ts startup
const storage = multer.diskStorage({
  destination(_req, _file, cb) { cb(null, getUploadsDir()); },
  filename(_req, file, cb) { cb(null, `${generateId()}${path.extname(file.originalname)}`); },
});
const upload = multer({ storage });

async function fetchObjectWithRelations(db: Pool, id: string): Promise<RealEstateObject | null> {
  const [[objRows], [paymentRows], [docRows]] = await Promise.all([
    db.query<RowDataPacket[]>('SELECT * FROM objects WHERE id = ?', [id]),
    db.query<RowDataPacket[]>('SELECT * FROM payment_records WHERE object_id = ? ORDER BY period ASC', [id]),
    db.query<RowDataPacket[]>('SELECT * FROM documents WHERE object_id = ? ORDER BY uploaded_at ASC', [id]),
  ]);
  if (objRows.length === 0) return null;
  return rowToObject(objRows[0], paymentRows.map(rowToPaymentRecord), docRows.map(rowToDocument));
}

function tryUnlink(filePath: string): void {
  try { fs.unlinkSync(filePath); } catch { /* already gone */ }
}

// PUT /api/objects/reorder — обновить порядок объектов
router.put('/reorder', async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body as { ids?: string[] };
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'ids must be an array' });
    return;
  }
  const conn = await req.db.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < ids.length; i++) {
      await conn.query<ResultSetHeader>(
        'UPDATE objects SET sort_order = ?, version = version + 1 WHERE id = ?',
        [i, ids[i]],
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    logError('PUT /objects/reorder', err);
    res.status(500).json({ error: 'Failed to reorder objects' });
  } finally {
    conn.release();
  }
});

// GET /api/objects
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const [[objectRows], [paymentRows], [docRows]] = await Promise.all([
      req.db.query<RowDataPacket[]>('SELECT * FROM objects ORDER BY sort_order ASC, created_at DESC'),
      req.db.query<RowDataPacket[]>('SELECT * FROM payment_records ORDER BY period ASC'),
      req.db.query<RowDataPacket[]>('SELECT * FROM documents ORDER BY uploaded_at ASC'),
    ]);

    const paymentsByObject = groupByObjectId(paymentRows, rowToPaymentRecord);
    const docsByObject     = groupByObjectId(docRows, rowToDocument);

    res.json(objectRows.map((row) =>
      rowToObject(
        row,
        paymentsByObject.get(row.id as string) ?? [],
        docsByObject.get(row.id as string) ?? [],
      ),
    ));
  } catch (err) {
    logError('GET /objects', err);
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
});

// POST /api/objects
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const obj = req.body as RealEstateObject;
    const cp  = obj.currentPayment;

    // Новый объект размещается в конце (max sort_order + 1)
    const [maxRows] = await req.db.query<RowDataPacket[]>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM objects WHERE category_id = ?',
      [obj.categoryId],
    );
    const sortOrder = (maxRows[0]?.next_order as number) ?? 0;

    await req.db.query<ResultSetHeader>(
      `INSERT INTO objects
        (id, category_id, street, building, tenant_name, tenant_phone, tenant_telegram,
         contract_date, planned_rent, planned_utilities,
         cp_date, cp_actual_rent, cp_rent_payment_date, cp_rent_payment_type,
         cp_actual_utilities, cp_utilities_payment_date, cp_utilities_payment_type, cp_note,
         is_archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        obj.id, obj.categoryId, obj.street, obj.building,
        obj.tenantName, obj.tenantPhone, obj.tenantTelegram, obj.contractDate,
        obj.plannedRent, cp.plannedUtilities ?? 0,
        cp.date ?? '', cp.actualRent ?? 0, cp.rentPaymentDate ?? '', cp.rentPaymentType ?? 'cash',
        cp.actualUtilities ?? 0, cp.utilitiesPaymentDate ?? '', cp.utilitiesPaymentType ?? 'cash',
        cp.note ?? null, obj.isArchived ? 1 : 0, sortOrder, obj.createdAt, obj.updatedAt,
      ],
    );

    res.status(201).json(rowToObject(
      {
        ...obj,
        category_id: obj.categoryId, tenant_name: obj.tenantName,
        tenant_phone: obj.tenantPhone, tenant_telegram: obj.tenantTelegram,
        contract_date: obj.contractDate, planned_rent: obj.plannedRent,
        planned_utilities: cp.plannedUtilities ?? 0, is_archived: obj.isArchived,
        created_at: obj.createdAt, updated_at: obj.updatedAt,
        cp_date: cp.date, cp_actual_rent: cp.actualRent,
        cp_rent_payment_date: cp.rentPaymentDate, cp_rent_payment_type: cp.rentPaymentType,
        cp_actual_utilities: cp.actualUtilities,
        cp_utilities_payment_date: cp.utilitiesPaymentDate,
        cp_utilities_payment_type: cp.utilitiesPaymentType, cp_note: cp.note,
      } as unknown as RowDataPacket,
      [], [],
    ));
  } catch (err) {
    logError('POST /objects', err);
    res.status(500).json({ error: 'Failed to create object' });
  }
});

// PUT /api/objects/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const obj = req.body as RealEstateObject;
    const cp  = obj.currentPayment;
    const clientVersion = typeof obj.version === 'number' ? obj.version : null;

    // Optimistic lock: если клиент прислал version — требуем совпадения с серверной.
    // Старые клиенты без version поля работают в режиме совместимости (last-write-wins).
    const whereClause = clientVersion !== null
      ? 'WHERE id = ? AND version = ?'
      : 'WHERE id = ?';
    const whereParams = clientVersion !== null ? [id, clientVersion] : [id];

    const [result] = await req.db.query<ResultSetHeader>(
      `UPDATE objects SET
        category_id = ?, street = ?, building = ?,
        tenant_name = ?, tenant_phone = ?, tenant_telegram = ?,
        contract_date = ?, planned_rent = ?, planned_utilities = ?,
        cp_date = ?, cp_actual_rent = ?, cp_rent_payment_date = ?, cp_rent_payment_type = ?,
        cp_actual_utilities = ?, cp_utilities_payment_date = ?, cp_utilities_payment_type = ?,
        cp_note = ?, is_archived = ?, updated_at = ?, version = version + 1
       ${whereClause}`,
      [
        obj.categoryId, obj.street, obj.building,
        obj.tenantName, obj.tenantPhone, obj.tenantTelegram,
        obj.contractDate, obj.plannedRent, cp.plannedUtilities ?? 0,
        cp.date ?? '', cp.actualRent ?? 0, cp.rentPaymentDate ?? '', cp.rentPaymentType ?? 'cash',
        cp.actualUtilities ?? 0, cp.utilitiesPaymentDate ?? '', cp.utilitiesPaymentType ?? 'cash',
        cp.note ?? null, obj.isArchived ? 1 : 0, obj.updatedAt,
        ...whereParams,
      ],
    );

    if (result.affectedRows === 0) {
      if (clientVersion !== null) {
        // Проверяем, существует ли объект — чтобы отличить 404 от 409
        const [exists] = await req.db.query<RowDataPacket[]>(
          'SELECT version FROM objects WHERE id = ?', [id],
        );
        if (exists.length > 0) {
          res.status(409).json({
            error: 'Object was modified by another session',
            currentVersion: exists[0].version as number,
          });
          return;
        }
      }
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    res.json(await fetchObjectWithRelations(req.db, id));
  } catch (err) {
    logError('PUT /objects/:id', err, { id: req.params.id });
    res.status(500).json({ error: 'Failed to update object' });
  }
});

// DELETE /api/objects/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [docRows] = await req.db.query<RowDataPacket[]>(
      'SELECT file_path FROM documents WHERE object_id = ?', [id],
    );
    for (const row of docRows) {
      if (row.file_path) tryUnlink(row.file_path as string);
    }
    await req.db.query<ResultSetHeader>('DELETE FROM objects WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    logError('DELETE /objects/:id', err, { id: req.params.id });
    res.status(500).json({ error: 'Failed to delete object' });
  }
});

async function setArchivedStatus(req: Request, res: Response, archived: boolean): Promise<void> {
  try {
    const { id } = req.params;
    const [result] = await req.db.query<ResultSetHeader>(
      'UPDATE objects SET is_archived = ?, updated_at = ?, version = version + 1 WHERE id = ?',
      [archived ? 1 : 0, new Date().toISOString(), id],
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    res.json(await fetchObjectWithRelations(req.db, id));
  } catch (err) {
    logError('setArchivedStatus', err, { id: req.params.id, archived });
    res.status(500).json({ error: archived ? 'Failed to archive object' : 'Failed to restore object' });
  }
}

router.post('/:id/archive', (req, res) => setArchivedStatus(req, res, true));
router.post('/:id/restore', (req, res) => setArchivedStatus(req, res, false));

// POST /api/objects/:id/payments
router.post('/:id/payments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const payment = req.body as PaymentRecord;
    const pid     = payment.id || generateId();
    const now     = new Date().toISOString();

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query<ResultSetHeader>(
        `INSERT INTO payment_records
          (id, object_id, period, rec_date, planned_rent, actual_rent,
           rent_payment_date, rent_payment_type,
           planned_utilities, actual_utilities,
           utilities_payment_date, utilities_payment_type, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pid, id, payment.period, payment.date,
          payment.plannedRent, payment.actualRent,
          payment.rentPaymentDate, payment.rentPaymentType,
          payment.plannedUtilities ?? 0, payment.actualUtilities,
          payment.utilitiesPaymentDate, payment.utilitiesPaymentType,
          payment.note ?? null,
        ],
      );
      await conn.query<ResultSetHeader>(
        `UPDATE objects SET
          cp_date = '', cp_actual_rent = 0, cp_rent_payment_date = '',
          cp_rent_payment_type = 'cash', cp_actual_utilities = 0,
          cp_utilities_payment_date = '', cp_utilities_payment_type = 'cash',
          cp_note = NULL, updated_at = ?, version = version + 1
         WHERE id = ?`,
        [now, id],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.status(201).json({ ...payment, id: pid });
  } catch (err) {
    logError('POST /objects/:id/payments', err, { id: req.params.id });
    res.status(500).json({ error: 'Failed to create payment record' });
  }
});

// PUT /api/objects/:id/payments/:pid
router.put('/:id/payments/:pid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, pid } = req.params;
    const payment = req.body as PaymentRecord;

    const [result] = await req.db.query<ResultSetHeader>(
      `UPDATE payment_records SET
        period = ?, rec_date = ?, planned_rent = ?, actual_rent = ?,
        rent_payment_date = ?, rent_payment_type = ?,
        planned_utilities = ?, actual_utilities = ?,
        utilities_payment_date = ?, utilities_payment_type = ?,
        note = ?
       WHERE id = ? AND object_id = ?`,
      [
        payment.period, payment.date,
        payment.plannedRent, payment.actualRent,
        payment.rentPaymentDate, payment.rentPaymentType,
        payment.plannedUtilities ?? 0, payment.actualUtilities,
        payment.utilitiesPaymentDate, payment.utilitiesPaymentType,
        payment.note ?? null,
        pid, id,
      ],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }

    res.json({ ...payment, id: pid });
  } catch (err) {
    logError('PUT /objects/:id/payments/:pid', err, { id: req.params.id, pid: req.params.pid });
    res.status(500).json({ error: 'Failed to update payment record' });
  }
});

// DELETE /api/objects/:id/payments/:pid
router.delete('/:id/payments/:pid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, pid } = req.params;
    await req.db.query<ResultSetHeader>(
      'DELETE FROM payment_records WHERE id = ? AND object_id = ?', [pid, id],
    );
    res.status(204).send();
  } catch (err) {
    logError('DELETE /objects/:id/payments/:pid', err, { id: req.params.id, pid: req.params.pid });
    res.status(500).json({ error: 'Failed to delete payment record' });
  }
});

// POST /api/objects/:id/documents
router.post('/:id/documents', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const docId    = generateId();
    const now      = new Date().toISOString();
    const filePath = req.file.path;
    // multer parses originalname as latin1; browsers send UTF-8 — decode back
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    await req.db.query<ResultSetHeader>(
      'INSERT INTO documents (id, object_id, name, size, mime_type, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [docId, id, originalName, req.file.size, req.file.mimetype, filePath, now],
    );

    res.status(201).json({
      id: docId,
      name: originalName,
      size: req.file.size,
      type: req.file.mimetype,
      url: `/api/objects/${id}/documents/${docId}/download`,
      uploadedAt: now,
    });
  } catch (err) {
    logError('POST /objects/:id/documents', err, { id: req.params.id });
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// GET /api/objects/:id/documents/:did/download
router.get('/:id/documents/:did/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, did } = req.params;
    const [rows] = await req.db.query<RowDataPacket[]>(
      'SELECT * FROM documents WHERE id = ? AND object_id = ?', [did, id],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.setHeader('Content-Type', rows[0].mime_type as string);
    // RFC 5987: filename* для UTF-8 имён, filename="" как fallback для старых браузеров
    const name = rows[0].name as string;
    const asciiFallback = name.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.sendFile(path.resolve(rows[0].file_path as string), (err) => {
      if (err) res.status(404).json({ error: 'File not found on disk' });
    });
  } catch (err) {
    logError('GET /objects/:id/documents/:did/download', err, { id: req.params.id, did: req.params.did });
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// DELETE /api/objects/:id/documents/:did
router.delete('/:id/documents/:did', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, did } = req.params;
    const [rows] = await req.db.query<RowDataPacket[]>(
      'SELECT file_path FROM documents WHERE id = ? AND object_id = ?', [did, id],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    tryUnlink(rows[0].file_path as string);
    await req.db.query<ResultSetHeader>('DELETE FROM documents WHERE id = ? AND object_id = ?', [did, id]);
    res.status(204).send();
  } catch (err) {
    logError('DELETE /objects/:id/documents/:did', err, { id: req.params.id, did: req.params.did });
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
