import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../db';
import { AppState } from '../types';
import { generateId, ensureUploadsDir } from '../utils';
import { rowToCategory, rowToPaymentRecord, rowToDocument, rowToObject, groupByObjectId } from '../mappers';

const router = Router();

// GET /api/state — full AppState in 5 parallel queries
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [[categoryRows], [objectRows], [paymentRows], [docRows], [settingsRows]] =
      await Promise.all([
        pool.query<RowDataPacket[]>('SELECT * FROM categories ORDER BY sort_order ASC'),
        pool.query<RowDataPacket[]>('SELECT * FROM objects ORDER BY created_at DESC'),
        pool.query<RowDataPacket[]>('SELECT * FROM payment_records ORDER BY period ASC'),
        pool.query<RowDataPacket[]>('SELECT * FROM documents ORDER BY uploaded_at ASC'),
        pool.query<RowDataPacket[]>('SELECT notification_days_before FROM settings WHERE id = 1'),
      ]);

    const paymentsByObject = groupByObjectId(paymentRows, rowToPaymentRecord);
    const docsByObject     = groupByObjectId(docRows, rowToDocument);

    const state: AppState = {
      categories: categoryRows.map(rowToCategory),
      objects: objectRows.map((row) =>
        rowToObject(
          row,
          paymentsByObject.get(row.id as string) ?? [],
          docsByObject.get(row.id as string) ?? [],
        ),
      ),
      activeCategoryId: null,
      notificationDaysBefore: settingsRows.length > 0
        ? (settingsRows[0].notification_days_before as number)
        : 3,
    };

    res.json(state);
  } catch (err) {
    console.error('GET /state error:', err);
    res.status(500).json({ error: 'Failed to fetch application state' });
  }
});

// POST /api/state/import — truncate all tables and re-insert (migration from localStorage)
router.post('/import', async (req: Request, res: Response): Promise<void> => {
  try {
    const importedState = req.body as AppState;

    if (!importedState || !Array.isArray(importedState.categories) || !Array.isArray(importedState.objects)) {
      res.status(400).json({ error: 'Invalid AppState payload' });
      return;
    }

    const uploadsDir = ensureUploadsDir();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query('TRUNCATE TABLE documents');
      await conn.query('TRUNCATE TABLE payment_records');
      await conn.query('TRUNCATE TABLE objects');
      await conn.query('TRUNCATE TABLE categories');
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');

      for (const cat of importedState.categories) {
        await conn.query<ResultSetHeader>(
          'INSERT INTO categories (id, name, icon, color, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [cat.id, cat.name, cat.icon ?? '', cat.color ?? '', cat.isDefault ? 1 : 0, cat.order ?? 0],
        );
      }

      for (const obj of importedState.objects) {
        const cp = obj.currentPayment;
        await conn.query<ResultSetHeader>(
          `INSERT INTO objects
            (id, category_id, street, building, tenant_name, tenant_phone, tenant_telegram,
             contract_date, planned_rent, planned_utilities,
             cp_date, cp_actual_rent, cp_rent_payment_date, cp_rent_payment_type,
             cp_actual_utilities, cp_utilities_payment_date, cp_utilities_payment_type, cp_note,
             is_archived, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            obj.id, obj.categoryId, obj.street, obj.building,
            obj.tenantName, obj.tenantPhone, obj.tenantTelegram, obj.contractDate,
            obj.plannedRent, obj.plannedUtilities,
            cp?.date ?? '', cp?.actualRent ?? 0,
            cp?.rentPaymentDate ?? '', cp?.rentPaymentType ?? 'cash',
            cp?.actualUtilities ?? 0,
            cp?.utilitiesPaymentDate ?? '', cp?.utilitiesPaymentType ?? 'cash',
            cp?.note ?? null,
            obj.isArchived ? 1 : 0, obj.createdAt, obj.updatedAt,
          ],
        );

        for (const payment of obj.paymentHistory ?? []) {
          await conn.query<ResultSetHeader>(
            `INSERT INTO payment_records
              (id, object_id, period, rec_date, planned_rent, actual_rent,
               rent_payment_date, rent_payment_type,
               planned_utilities, actual_utilities,
               utilities_payment_date, utilities_payment_type, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              payment.id, obj.id, payment.period, payment.date,
              payment.plannedRent, payment.actualRent,
              payment.rentPaymentDate, payment.rentPaymentType,
              payment.plannedUtilities, payment.actualUtilities,
              payment.utilitiesPaymentDate, payment.utilitiesPaymentType,
              payment.note ?? null,
            ],
          );
        }

        for (const doc of obj.documents ?? []) {
          let filePath = '';

          if (doc.dataUrl) {
            const matches = doc.dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
            if (matches) {
              const ext    = matches[1].split('/')[1] ?? 'bin';
              const buffer = Buffer.from(matches[2], 'base64');
              filePath = path.join(uploadsDir, `${doc.id}.${ext}`);
              await fs.promises.writeFile(filePath, buffer);
            }
          }

          await conn.query<ResultSetHeader>(
            'INSERT INTO documents (id, object_id, name, size, mime_type, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [doc.id, obj.id, doc.name, doc.size, doc.type, filePath, doc.uploadedAt],
          );
        }
      }

      if (typeof importedState.notificationDaysBefore === 'number') {
        await conn.query<ResultSetHeader>(
          `INSERT INTO settings (id, notification_days_before) VALUES (1, ?)
           ON DUPLICATE KEY UPDATE notification_days_before = VALUES(notification_days_before)`,
          [importedState.notificationDaysBefore],
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /state/import error:', err);
    res.status(500).json({ error: 'Failed to import state' });
  }
});

export default router;
