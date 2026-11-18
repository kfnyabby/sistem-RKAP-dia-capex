const { z } = require('zod');

const createBudgetDocSchema = z.object({
  period_id: z.number({ required_error: 'period_id wajib diisi' }).int().positive(),
  unit_id: z.number({ required_error: 'unit_id wajib diisi' }).int().positive(),
  type: z.enum(['BIAYA', 'INVESTASI'], {
    errorMap: () => ({ message: 'type harus BIAYA atau INVESTASI' }),
  }),
});

const expenseLineItemSchema = z.object({
  id: z.number().int().optional().nullable(),
  item_id: z.number({ required_error: 'item_id wajib diisi' }).int().positive(),
  qty: z.number({ required_error: 'qty wajib diisi' }).int().min(0, 'Qty tidak boleh negatif'),
  version: z.number().int().optional(),
  note: z.string().optional().nullable(),
});

const updateExpenseLinesSchema = z.object({
  lines: z.array(expenseLineItemSchema, {
    required_error: 'lines wajib berupa array',
  }),
});

module.exports = {
  createBudgetDocSchema,
  expenseLineItemSchema,
  updateExpenseLinesSchema,
};

