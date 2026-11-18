const expenseBudgetService = require('../services/expenseBudget.service');
const {
  createBudgetDocSchema,
  updateExpenseLinesSchema,
} = require('../validators/budgetDoc.validator');

const getDocs = async (req, res, next) => {
  try {
    const result = await expenseBudgetService.listDocs(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const createDoc = async (req, res, next) => {
  try {
    const validatedData = createBudgetDocSchema.parse(req.body);
    const result = await expenseBudgetService.createDoc(validatedData, req.user);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const getDocById = async (req, res, next) => {
  try {
    const doc = await expenseBudgetService.getDocDetail(req.params.id, req.user);
    res.json({
      success: true,
      ...doc,
      data: doc,
    });
  } catch (err) {
    next(err);
  }
};

const getExpenseLines = async (req, res, next) => {
  try {
    const result = await expenseBudgetService.listExpenseLines(
      req.params.id,
      req.query,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateExpenseLines = async (req, res, next) => {
  try {
    const validatedData = updateExpenseLinesSchema.parse(req.body);
    const result = await expenseBudgetService.saveExpenseLines(
      req.params.id,
      validatedData.lines,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteExpenseLine = async (req, res, next) => {
  try {
    const result = await expenseBudgetService.deleteExpenseLine(
      req.params.id,
      req.user
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDocs,
  createDoc,
  getDocById,
  getExpenseLines,
  updateExpenseLines,
  deleteExpenseLine,
};
