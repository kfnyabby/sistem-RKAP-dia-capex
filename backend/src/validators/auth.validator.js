const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Password saat ini wajib diisi'),
    new_password: z.string().min(8, 'Password baru minimal 8 karakter'),
    new_password_confirmation: z.string().min(8, 'Konfirmasi password baru minimal 8 karakter'),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: 'Konfirmasi password tidak cocok dengan password baru',
    path: ['new_password_confirmation'],
  });

module.exports = {
  loginSchema,
  changePasswordSchema,
};

