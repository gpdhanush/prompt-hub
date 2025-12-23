import express from "express";
import { db } from "../config/database.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createAuditLog,
  getClientIp,
  getUserAgent,
} from "../utils/auditLogger.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get activity logs for current user (all authenticated users)
router.get("/activity", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 50,
      search,
      action,
      module,
      startDate,
      endDate,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = ["al.user_id = ?"];
    let queryParams = [userId];

    // Build WHERE clause dynamically
    if (search && search !== "undefined" && search.trim() !== "") {
      whereConditions.push(`(al.module LIKE ? OR al.action LIKE ?)`);
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam);
    }

    if (action && action !== "undefined" && action.trim() !== "") {
      whereConditions.push("al.action = ?");
      queryParams.push(action);
    }

    if (module && module !== "undefined" && module.trim() !== "") {
      whereConditions.push("al.module = ?");
      queryParams.push(module);
    }

    if (startDate && startDate !== "undefined" && startDate.trim() !== "") {
      whereConditions.push("DATE(al.created_at) >= ?");
      queryParams.push(startDate);
    }

    if (endDate && endDate !== "undefined" && endDate.trim() !== "") {
      whereConditions.push("DATE(al.created_at) <= ?");
      queryParams.push(endDate);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Get audit logs
    const [logs] = await db.query(
      `
      SELECT 
        al.id,
        al.user_id,
        al.action,
        al.module,
        al.item_id,
        al.item_type,
        al.before_data,
        al.after_data,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    const [countResult] = await db.query(
      `
      SELECT COUNT(*) as total
      FROM audit_logs al
      ${whereClause}
    `,
      queryParams
    );

    // Parse JSON fields
    const formattedLogs = logs.map((log) => ({
      ...log,
      before_data: log.before_data ? JSON.parse(log.before_data) : null,
      after_data: log.after_data ? JSON.parse(log.after_data) : null,
    }));

    res.json({
      data: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("Error fetching activity logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs with advanced filtering (Admin only)
router.get("/", authorize("Super Admin", "Admin"), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      action,
      module,
      userId,
      startDate,
      endDate,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = [];
    let queryParams = [];

    // Build WHERE clause dynamically - only add conditions for valid values
    if (search && search !== "undefined" && search.trim() !== "") {
      whereConditions.push(
        `(u.name LIKE ? OR al.module LIKE ? OR al.action LIKE ?)`
      );
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam);
    }

    if (action && action !== "undefined" && action.trim() !== "") {
      whereConditions.push("al.action = ?");
      queryParams.push(action);
    }

    if (module && module !== "undefined" && module.trim() !== "") {
      whereConditions.push("al.module = ?");
      queryParams.push(module);
    }

    if (userId && userId !== "undefined" && userId.trim() !== "") {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum)) {
        whereConditions.push("al.user_id = ?");
        queryParams.push(userIdNum);
      }
    }

    if (startDate && startDate !== "undefined" && startDate.trim() !== "") {
      whereConditions.push("DATE(al.created_at) >= ?");
      queryParams.push(startDate);
    }

    if (endDate && endDate !== "undefined" && endDate.trim() !== "") {
      whereConditions.push("DATE(al.created_at) <= ?");
      queryParams.push(endDate);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Get audit logs with user information
    const [logs] = await db.query(
      `
      SELECT 
        al.id,
        al.user_id,
        u.name as user_name,
        u.email as user_email,
        al.action,
        al.module,
        al.item_id,
        al.item_type,
        al.before_data,
        al.after_data,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    const [countResult] = await db.query(
      `
      SELECT COUNT(*) as total
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `,
      queryParams
    );
    const safeParse = (value) => {
      if (!value) return null;

      // Already an object → return as is
      if (typeof value === "object") return value;

      // Must be a string to parse
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Invalid JSON:", value);
          return null;
        }
      }

      return null;
    };
    // Parse JSON fields
    const formattedLogs = logs.map((log) => ({
      ...log,
      before_data: safeParse(log.before_data),
      after_data: safeParse(log.after_data),
    }));

    // Get statistics
    const [stats] = await db.query(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN al.action = 'CREATE' THEN 1 ELSE 0 END) as creates,
        SUM(CASE WHEN al.action = 'UPDATE' THEN 1 ELSE 0 END) as updates,
        SUM(CASE WHEN al.action = 'DELETE' THEN 1 ELSE 0 END) as deletes
      FROM audit_logs al
      ${whereClause}
    `,
      queryParams
    );

    res.json({
      data: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
      },
      stats: stats[0],
    });
  } catch (error) {
    logger.error("Error fetching audit logs:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single audit log by ID
router.get("/:id", authorize("Super Admin", "Admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const [logs] = await db.query(
      `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `,
      [id]
    );

    if (logs.length === 0) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    const log = logs[0];
    log.before_data = log.before_data ? JSON.parse(log.before_data) : null;
    log.after_data = log.after_data ? JSON.parse(log.after_data) : null;

    res.json({ data: log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available filters (actions, modules, users)
router.get(
  "/filters/options",
  authorize("Super Admin", "Admin"),
  async (req, res) => {
    try {
      const [actions] = await db.query(`
      SELECT DISTINCT action 
      FROM audit_logs 
      ORDER BY action
    `);

      const [modules] = await db.query(`
      SELECT DISTINCT module 
      FROM audit_logs 
      ORDER BY module
    `);

      const [users] = await db.query(`
      SELECT DISTINCT u.id, u.name, u.email
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      ORDER BY u.name
    `);

      res.json({
        actions: actions.map((a) => a.action),
        modules: modules.map((m) => m.module),
        users: users,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Restore data from audit log (for UPDATE/DELETE actions)
router.post(
  "/:id/restore",
  authorize("Super Admin", "Admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      // Get the audit log
      const [logs] = await db.query(
        `
      SELECT * FROM audit_logs WHERE id = ?
    `,
        [id]
      );

      if (logs.length === 0) {
        return res.status(404).json({ error: "Audit log not found" });
      }

      const auditLog = logs[0];

      // Only allow restore for UPDATE and DELETE actions
      if (!["UPDATE", "DELETE"].includes(auditLog.action)) {
        return res.status(400).json({
          error: `Cannot restore from ${auditLog.action} action. Only UPDATE and DELETE actions can be restored.`,
        });
      }

      // Check if before_data exists
      if (!auditLog.before_data) {
        return res.status(400).json({
          error: "No before_data available for restoration",
        });
      }

      const beforeData = JSON.parse(auditLog.before_data);
      const module = auditLog.module;
      const itemId = auditLog.item_id;
      const itemType = auditLog.item_type;

      if (!itemId) {
        return res.status(400).json({
          error: "Item ID not available for restoration",
        });
      }

      // Determine the table name based on module
      const tableMap = {
        Users: "users",
        Employees: "employees",
        Projects: "projects",
        Tasks: "tasks",
        Bugs: "bugs",
        Leaves: "leaves",
        Reimbursements: "reimbursements",
        Prompts: "prompts",
      };

      const tableName = tableMap[module];
      if (!tableName) {
        return res.status(400).json({
          error: `Restore not supported for module: ${module}`,
        });
      }

      // Check if item still exists (for DELETE, it might not)
      const [existing] = await db.query(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [itemId]
      );

      // Build UPDATE query dynamically based on before_data
      const fields = Object.keys(beforeData).filter(
        (key) => key !== "id" && key !== "created_at"
      );
      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      const values = fields.map((field) => beforeData[field]);

      if (fields.length === 0) {
        return res.status(400).json({
          error: "No restorable fields found in before_data",
        });
      }

      // If item doesn't exist (was deleted), we need to INSERT instead
      if (existing.length === 0 && auditLog.action === "DELETE") {
        // For DELETE restore, we'll need to INSERT
        // This is more complex and might need special handling per table
        return res.status(400).json({
          error:
            "Item was deleted. Full restoration from DELETE requires manual intervention.",
        });
      }

      // Update the item with before_data
      await db.query(
        `
      UPDATE ${tableName} 
      SET ${setClause}, updated_at = NOW()
      WHERE id = ?
    `,
        [...values, itemId]
      );

      // Create audit log for the restore action
      await createAuditLog({
        userId: currentUserId,
        action: "RESTORE",
        module: module,
        itemId: itemId,
        itemType: itemType,
        beforeData: null, // Current state (after restore)
        afterData: beforeData, // Restored data
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        metadata: { restored_from_audit_log_id: id },
      });

      res.json({
        message: "Data restored successfully",
        restoredData: beforeData,
      });
    } catch (error) {
      logger.error("Error restoring data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Export audit logs
router.get(
  "/export/csv",
  authorize("Super Admin", "Admin"),
  async (req, res) => {
    try {
      const { startDate, endDate, action, module } = req.query;

      let whereConditions = [];
      let queryParams = [];

      if (startDate) {
        whereConditions.push("DATE(al.created_at) >= ?");
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push("DATE(al.created_at) <= ?");
        queryParams.push(endDate);
      }

      if (action) {
        whereConditions.push("al.action = ?");
        queryParams.push(action);
      }

      if (module) {
        whereConditions.push("al.module = ?");
        queryParams.push(module);
      }

      const whereClause =
        whereConditions.length > 0
          ? "WHERE " + whereConditions.join(" AND ")
          : "";

      const [logs] = await db.query(
        `
      SELECT 
        al.id,
        u.name as user_name,
        al.action,
        al.module,
        al.item_id,
        al.item_type,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
    `,
        queryParams
      );

      // Convert to CSV
      const csvHeader =
        "ID,User,Action,Module,Item ID,Item Type,IP Address,Timestamp\n";
      const csvRows = logs
        .map(
          (log) =>
            `${log.id},"${log.user_name || "N/A"}",${log.action},${
              log.module
            },${log.item_id || "N/A"},${log.item_type || "N/A"},"${
              log.ip_address || "N/A"
            }",${log.created_at}`
        )
        .join("\n");

      const csv = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=audit-logs-${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
