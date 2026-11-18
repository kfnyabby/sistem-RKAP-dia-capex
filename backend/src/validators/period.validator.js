const { z } = require('zod');

const createPeriodSchema = z
  .object({
    company_id: z.number({ required_error: 'company_id wajib diisi' }).int().positive(),
    year: z.number({ required_error: 'year wajib diisi' }).int().min(2000).max(2100),
    fill_deadline: z.string().optional().nullable(),
    review_deadline: z.string().optional().nullable(),
    lock_date: z.string().optional().nullable(),
    submission_state: z.enum(['BUKA', 'TUTUP']).optional(),
    auto_close: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.fill_deadline && data.review_deadline) {
        return new Date(data.review_deadline) >= new Date(data.fill_deadline);
      }
      return true;
    },
    {
      message: 'review_deadline tidak boleh lebih awal dari fill_deadline',
      path: ['review_deadline'],
    }
  );

module.exports = {
  createPeriodSchema,
};

