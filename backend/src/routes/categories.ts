import { Router, Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../db';
import { Category } from '../types';
import { rowToCategory } from '../mappers';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM categories ORDER BY sort_order ASC',
    );
    res.json(rows.map(rowToCategory));
  } catch (err) {
    console.error('GET /categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, icon, color, isDefault, order } = req.body as Category;

    await pool.query<ResultSetHeader>(
      'INSERT INTO categories (id, name, icon, color, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, icon ?? '', color ?? '', isDefault ? 1 : 0, order ?? 0],
    );

    res.status(201).json({ id, name, icon: icon ?? '', color: color ?? '', isDefault: Boolean(isDefault), order: order ?? 0 });
  } catch (err) {
    console.error('POST /categories error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, icon, color, isDefault, order } = req.body as Partial<Category>;

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE categories SET name = ?, icon = ?, color = ?, is_default = ?, sort_order = ? WHERE id = ?',
      [name, icon ?? '', color ?? '', isDefault ? 1 : 0, order ?? 0, id],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json({ id, name, icon: icon ?? '', color: color ?? '', isDefault: Boolean(isDefault), order: order ?? 0 });
  } catch (err) {
    console.error('PUT /categories/:id error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [objectRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM objects WHERE category_id = ?',
      [id],
    );

    if ((objectRows[0].cnt as number) > 0) {
      res.status(409).json({ error: 'Cannot delete category: it has associated objects' });
      return;
    }

    await pool.query<ResultSetHeader>('DELETE FROM categories WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /categories/:id error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
