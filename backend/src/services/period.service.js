const periodRepository = require('../repositories/period.repository');
const AuditService = require('./audit.service');

const listPeriods = async (companyId = null) => {
  return await periodRepository.findAll(companyId);
};

const createPeriod = async (periodData, user) => {
  const existing = await periodRepository.findByCompanyAndYear(
    periodData.company_id,
    periodData.year
  );
  if (existing) {
    const error = new Error('Periode untuk perusahaan dan tahun ini sudah ada');
    error.status = 409;
    throw error;
  }

  const newPeriod = await periodRepository.create({
    ...periodData,
    created_by: user.id,
  });

  await AuditService.log(
    user.id,
    'periods',
    newPeriod.id,
    'CREATE_PERIOD',
    null,
    {
      company_id: newPeriod.company_id,
      year: newPeriod.year,
      fill_deadline: newPeriod.fill_deadline,
      review_deadline: newPeriod.review_deadline,
      lock_date: newPeriod.lock_date,
    }
  );

  return {
    period_id: newPeriod.id,
    status: newPeriod.status,
  };
};

module.exports = {
  listPeriods,
  createPeriod,
};

