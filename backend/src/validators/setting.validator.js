const { z } = require('zod');

/**
 * Skema Validasi Pengaturan Sistem (Fase 8)
 */
const updateSettingsSchema = z
  .object({
    investment_threshold: z
      .number({ invalid_type_error: 'investment_threshold harus berupa angka' })
      .positive('investment_threshold harus lebih besar dari 0')
      .optional(),
    investment_threshold_basis: z
      .enum(['unit_price', 'line_total'], {
        errorMap: () => ({ message: "investment_threshold_basis harus 'unit_price' atau 'line_total'" }),
      })
      .optional(),
    investment_text_max_length: z
      .number()
      .int('investment_text_max_length harus berupa bilangan bulat')
      .min(50, 'Batas karakter teks minimal 50')
      .max(2000, 'Batas karakter teks maksimal 2000')
      .optional(),
    warning_percent: z
      .number()
      .min(1, 'warning_percent minimal 1%')
      .max(100, 'warning_percent maksimal 100%')
      .optional(),
    critical_percent: z
      .number()
      .min(1, 'critical_percent minimal 1%')
      .max(200, 'critical_percent maksimal 200%')
      .optional(),
    investment_asset_coas: z
      .array(z.string().min(1, 'Kode COA aset tidak boleh kosong'), {
        invalid_type_error: 'investment_asset_coas harus berupa array kode COA',
      })
      .min(1, 'Minimal sertakan 1 kode COA aset')
      .optional(),
    auto_reopen_on_return: z.boolean({ invalid_type_error: 'auto_reopen_on_return harus berupa boolean' }).optional(),
    auto_close_on_deadline: z.boolean({ invalid_type_error: 'auto_close_on_deadline harus berupa boolean' }).optional(),
    reminder_days: z
      .array(z.number().int().min(1).max(30), {
        invalid_type_error: 'reminder_days harus berupa array hari (1-30)',
      })
      .optional(),
    accounting_contact: z
      .string()
      .min(3, 'Kontak akuntansi minimal 3 karakter')
      .max(255, 'Kontak akuntansi maksimal 255 karakter')
      .optional(),
    justification_percent: z
      .number()
      .min(1, 'justification_percent minimal 1%')
      .max(100, 'justification_percent maksimal 100%')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.warning_percent !== undefined && data.critical_percent !== undefined) {
        return data.critical_percent >= data.warning_percent;
      }
      return true;
    },
    {
      message: 'critical_percent harus lebih besar atau sama dengan warning_percent',
      path: ['critical_percent'],
    }
  );

module.exports = {
  updateSettingsSchema,
};
