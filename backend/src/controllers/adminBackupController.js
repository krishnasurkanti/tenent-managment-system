const { createBackup, listBackups, getBackupById } = require("../services/backupService");

async function listBackupsController(req, res, next) {
  try {
    const backups = await listBackups();
    return res.json({ backups });
  } catch (error) {
    return next(error);
  }
}

async function triggerBackupController(req, res, next) {
  try {
    const backup = await createBackup("manual");
    return res.json({ ok: true, backup });
  } catch (error) {
    return next(error);
  }
}

async function getBackupController(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid backup ID." });
    const backup = await getBackupById(id);
    if (!backup) return res.status(404).json({ message: "Backup not found." });
    return res.json({ backup });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listBackupsController, triggerBackupController, getBackupController };
