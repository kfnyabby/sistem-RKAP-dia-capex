const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['pic', 'manager', 'akuntansi'], {
    errorMap: () => ({ message: 'Role harus salah satu dari: pic, manager, akuntansi' }),
  }),
  company_ids: z.array(z.number()).optional(),
  unit_ids: z.array(z.number()).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  email: z.string().email('Format email tidak valid').optional(),
  role: z.enum(['pic', 'manager', 'akuntansi']).optional(),
});

const updateStatusSchema = z.object({
  is_active: z.boolean({ required_error: 'Status is_active wajib boolean' }),
});

const updateUnitsSchema = z.object({
  unit_ids: z.array(z.number(), { required_error: 'unit_ids wajib berupa array angka' }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  updateUnitsSchema,
};

