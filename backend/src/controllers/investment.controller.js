const investmentBudgetService = require('../services/investmentBudget.service');

const getInvestmentLines = async (req, res, next) => {
  try {
    const result = await investmentBudgetService.listInvestmentLines(
      req.params.id,
      req.query,
      req.user
    );
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const createInvestmentLine = async (req, res, next) => {
  try {
    const data = await investmentBudgetService.createInvestmentLine(
      req.params.id,
      req.body,
      req.user
    );
    res.status(201).json({
      success: true,
      message: 'Baris investasi berhasil ditambahkan',
      data,
    });
  } catch (err) {
    next(err);
  }
};

const updateInvestmentLine = async (req, res, next) => {
  try {
    const data = await investmentBudgetService.updateInvestmentLine(
      req.params.id,
      req.body,
      req.user
    );
    res.json({
      success: true,
      message: 'Baris investasi berhasil diperbarui',
      data,
    });
  } catch (err) {
    next(err);
  }
};

const deleteInvestmentLine = async (req, res, next) => {
  try {
    const result = await investmentBudgetService.deleteInvestmentLine(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getSuggestions = async (req, res, next) => {
  try {
    const field = req.query.field;
    if (!field) {
      return res.status(400).json({
        success: false,
        message: 'Parameter field wajib disertakan',
      });
    }
    const data = await investmentBudgetService.getSuggestions(req.params.id, field, req.user);
    res.json({
      success: true,
      field,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const getLastLineText = async (req, res, next) => {
  try {
    const data = await investmentBudgetService.getLastLineText(req.params.id, req.user);
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

const listCrossUnitLines = async (req, res, next) => {
  try {
    const result = await investmentBudgetService.listLaptopPcCrossUnit(req.query, req.user);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

const getPriorities = async (req, res, next) => {
  try {
    const db = require('../../db');
    const result = await db.query('SELECT id, name FROM priorities ORDER BY id ASC');
    res.json({
      success: true,
      data: result.rows,
      meta: { total: result.rows.length },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInvestmentLines,
  createInvestmentLine,
  updateInvestmentLine,
  deleteInvestmentLine,
  getSuggestions,
  getLastLineText,
  listCrossUnitLines,
  getPriorities,
};
