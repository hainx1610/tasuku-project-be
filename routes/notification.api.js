const express = require("express");
const taskController = require("../controllers/task.controllers");
const validators = require("../middlewares/validators");
const { body, param } = require("express-validator");
const authentication = require("../middlewares/authentication");
const notificationController = require("../controllers/notification.controllers");

const router = express.Router();

/**
 * @route GET api/notifications/user/:userId
 * @description Get a list of notifications for a user
 * @access private
 */
router.get(
  "/users/:userId",
  authentication.accessRequired,
  validators.validate([
    param("userId").exists().isString().custom(validators.checkObjectId),
  ]),
  notificationController.getNotificationsByUser
);

router.get(
  "/subscribe/users/:userId",
  authentication.accessRequired,
  validators.validate([
    param("userId").exists().isString().custom(validators.checkObjectId),
  ]),
  notificationController.getNotificationsByUserRealTime
);

router.delete(
  // "/me",
  "/users/:userId",
  authentication.accessRequired,
  validators.validate([]),
  notificationController.markReadAllNotifications
);

module.exports = router;
