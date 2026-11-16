const userService = require('../services/user.service');
const {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  updateUnitsSchema,
} = require('../validators/user.validator');

const getUsers = async (req, res, next) => {
  try {
    const { role, search, is_active, page, per_page } = req.query;
    const result = await userService.listUsers({
      role,
      search,
      isActive: is_active,
      page,
      perPage: per_page,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(422).json({
        message: 'Validasi input gagal',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const result = await userService.createUser(parseResult.data, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const result = await userService.getUserDetail(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(422).json({
        message: 'Validasi input gagal',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const result = await userService.updateUser(req.params.id, parseResult.data, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const parseResult = updateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(422).json({
        message: 'Validasi input gagal',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const result = await userService.updateUserStatus(
      req.params.id,
      parseResult.data.is_active,
      req.user.id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const updateUnits = async (req, res, next) => {
  try {
    const parseResult = updateUnitsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(422).json({
        message: 'Validasi input gagal',
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const result = await userService.updateUserUnits(
      req.params.id,
      parseResult.data.unit_ids,
      req.user.id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  updateStatus,
  updateUnits,
};

