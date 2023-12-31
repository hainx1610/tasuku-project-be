const mongoose = require("mongoose");
const { AppError, sendResponse, catchAsync } = require("../helpers/utils");
const User = require("../models/User");
const Project = require("../models/Project");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendUserConfirmationLink } = require("../helpers/emails");

const userController = {};

userController.createUser = catchAsync(async (req, res, next) => {
  // Get data from request
  let { name, email, password, role } = req.body;
  // let isVerified = role === "manager" ? true : false;

  // Business Logic Validation
  let user = await User.findOne({ email });
  if (user) throw new AppError(400, "User already exists", "Create User Error");

  // Process
  //   crypting password
  const salt = await bcrypt.genSalt(10);
  password = await bcrypt.hash(password, salt);
  // user = await User.create({ name, email, password, role, isVerified });
  const confirmToken = crypto.randomBytes(48).toString("base64url");
  user = await User.create({ name, email, password, role, confirmToken });

  // gen an accessToken for user
  // const accessToken = await user.generateAccessToken();

  const link = `${req.protocol}://${req.get(
    "host"
  )}/api/users/confirm_email?email=${email}&token=${confirmToken}`;
  await sendUserConfirmationLink(email, link);

  // Response
  sendResponse(
    res,
    200,
    true,
    // { user, accessToken },
    { user },
    null,
    "Create User successful"
  );
});

userController.confirmUserEmail = catchAsync(async (req, res, next) => {
  let { email, token } = req.query;

  // check email and token then update
  let user = await User.findOneAndUpdate(
    { email, confirmToken: token },
    { isVerified: true, confirmToken: undefined },
    { new: true }
  );
  if (!user) throw new AppError(400, "User not found", "Confirm Email Error");

  res.redirect(`${process.env.CLIENT_URL}/login`);

  sendResponse(
    res,
    200,
    true,
    { user },
    null,
    "Confirm Invitation Email successful"
  );
});

userController.getUsers = async (req, res, next) => {
  try {
    const name = req.query.name;
    const role = req.query.role;
    const filter = { name, role };
    if (!name) delete filter.name;
    if (!role) delete filter.role;
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .populate("responsibleFor", "name description status");
    if (!users) throw new AppError(400, "Bad Request", "Users not found!");
    sendResponse(res, 200, true, users, null, "Get all users success");
  } catch (error) {
    next(error);
  }
};

userController.getUsersByProject = catchAsync(async (req, res, next) => {
  const currentUserId = req.userId;
  const currentUserRole = req.userRole;

  let { projectId } = req.params;

  const project = await Project.findById(projectId).populate("includeMembers");
  if (!project)
    throw new AppError(400, "Project not found", "Get users by project Error");

  const users = project.includeMembers;
  if (!users)
    throw new AppError(400, "Users not found", "Get users by project Error");

  sendResponse(res, 200, true, users, null, "Get users by project success");
});

userController.getCurrentUser = catchAsync(async (req, res, next) => {
  const currentUserId = req.userId;
  const currentUserRole = req.userRole;

  const user = await User.findOne({ _id: currentUserId }).populate(
    "responsibleFor memberOf"
  );
  if (!user)
    throw new AppError(400, "User not found", "Get Current User Error");

  sendResponse(res, 200, true, user, null, "Get current User success");
});

userController.changePassword = catchAsync(async (req, res, next) => {
  const currentUserId = req.userId;
  const currentUserRole = req.userRole;

  let { currentPassword, newPassword } = req.body;

  let user = await User.findOne({ _id: currentUserId }, "+password").populate(
    "responsibleFor"
  );
  if (!user)
    throw new AppError("400", "User not found", "Change password Error");

  // check current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch)
    throw new AppError(
      "400",
      "Wrong current password",
      "Change password Error"
    );

  // encrypt new password
  const salt = await bcrypt.genSalt(10);
  newPassword = await bcrypt.hash(newPassword, salt);

  user = await User.findByIdAndUpdate(
    { _id: currentUserId },
    { password: newPassword },
    { new: true }
  );

  sendResponse(res, 200, true, user, null, "Change password success");
});

userController.getSingleUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const filter = { _id: id };
    const singleUser = await User.findOne(filter)
      // .sort({ createdAt: -1 })
      .populate("responsibleFor", "name description status");
    if (!singleUser) throw new AppError(400, "Bad Request", "User not found!");
    sendResponse(res, 200, true, singleUser, null, "Get single user success");
  } catch (error) {
    next(error);
  }
};

userController.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await User.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true, runValidators: true }
    );
    if (!deleted) throw new AppError(400, "Bad Request", "User not found!");
    sendResponse(res, 200, true, deleted, null, "Delete user success");
  } catch (error) {
    next(error);
  }
};

module.exports = userController;
