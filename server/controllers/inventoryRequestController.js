const db = require("../config/db");

const allowedRequestTypes = ["outlet", "customer", "warehouse", "internal"];
const allowedStatuses = [
  "draft",
  "submitted",
  "approved",
  "fulfilled",
  "rejected",
  "cancelled",
];

const generateRequestNumber = () => {
  return `IRQ-${Date.now().toString().slice(-8)}`;
};

const cleanValue = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const toNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return Number(value);
};

const getUserId = (req) => {
  return req.user?.id || req.user?.user_id || null;
};

const normalizeItems = (items = []) => {
  return items
    .map((item) => ({
      id: item.id || null,
      product_id: item.product_id,
      requested_qty: toNumber(item.requested_qty),
      approved_qty: toNumber(item.approved_qty),
      issued_qty: toNumber(item.issued_qty),
    }))
    .filter((item) => item.product_id && item.requested_qty > 0);
};

const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "At least one request item is required";
  }

  const validItems = normalizeItems(items);

  if (validItems.length === 0) {
    return "Valid product and requested quantity are required";
  }

  return "";
};

exports.getInventoryRequests = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      request_type = "",
      from_warehouse_id = "",
      to_warehouse_id = "",
    } = req.query;

    const where = [];
    const params = [];

    if (status) {
      where.push("ir.status = ?");
      params.push(status);
    }

    if (request_type) {
      where.push("ir.request_type = ?");
      params.push(request_type);
    }

    if (from_warehouse_id) {
      where.push("ir.from_warehouse_id = ?");
      params.push(from_warehouse_id);
    }

    if (to_warehouse_id) {
      where.push("ir.to_warehouse_id = ?");
      params.push(to_warehouse_id);
    }

    if (search) {
      where.push(`
        (
          ir.request_number LIKE ?
          OR ir.request_type LIKE ?
          OR ir.status LIKE ?
          OR ir.remarks LIKE ?
          OR fw.name LIKE ?
          OR fw.warehouse_code LIKE ?
          OR tw.name LIKE ?
          OR tw.warehouse_code LIKE ?
        )
      `);

      const keyword = `%${search}%`;
      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [requests] = await db.query(
      `
      SELECT
        ir.id,
        ir.request_number,
        ir.request_type,
        ir.requested_by,
        ir.from_warehouse_id,
        fw.name AS from_warehouse_name,
        fw.warehouse_code AS from_warehouse_code,
        ir.to_warehouse_id,
        tw.name AS to_warehouse_name,
        tw.warehouse_code AS to_warehouse_code,
        ir.request_date,
        ir.required_date,
        ir.status,
        ir.remarks,
        ir.created_at,
        COUNT(iri.id) AS item_count,
        COALESCE(SUM(iri.requested_qty), 0) AS total_requested_qty,
        COALESCE(SUM(iri.approved_qty), 0) AS total_approved_qty,
        COALESCE(SUM(iri.issued_qty), 0) AS total_issued_qty
      FROM inventory_requests ir
      LEFT JOIN warehouses fw ON fw.id = ir.from_warehouse_id
      LEFT JOIN warehouses tw ON tw.id = ir.to_warehouse_id
      LEFT JOIN inventory_request_items iri ON iri.inventory_request_id = ir.id
      ${whereSql}
      GROUP BY ir.id
      ORDER BY ir.id DESC
      `,
      params
    );

    res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get inventory requests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory requests",
      error: error.message,
    });
  }
};

exports.getInventoryRequestSummary = async (req, res) => {
  try {
    const [[summary]] = await db.query(
      `
      SELECT
        COUNT(id) AS total_requests,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_requests,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted_requests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_requests,
        SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) AS fulfilled_requests,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_requests,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_requests
      FROM inventory_requests
      `
    );

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Get inventory request summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory request summary",
      error: error.message,
    });
  }
};

exports.getInventoryRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[request]] = await db.query(
      `
      SELECT
        ir.id,
        ir.request_number,
        ir.request_type,
        ir.requested_by,
        ir.from_warehouse_id,
        fw.name AS from_warehouse_name,
        fw.warehouse_code AS from_warehouse_code,
        ir.to_warehouse_id,
        tw.name AS to_warehouse_name,
        tw.warehouse_code AS to_warehouse_code,
        ir.request_date,
        ir.required_date,
        ir.status,
        ir.remarks,
        ir.created_at
      FROM inventory_requests ir
      LEFT JOIN warehouses fw ON fw.id = ir.from_warehouse_id
      LEFT JOIN warehouses tw ON tw.id = ir.to_warehouse_id
      WHERE ir.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Inventory request not found",
      });
    }

    const [items] = await db.query(
      `
      SELECT
        iri.id,
        iri.inventory_request_id,
        iri.product_id,
        p.name AS product_name,
        p.product_code,
        p.sku,
        u.short_name AS unit_name,
        iri.requested_qty,
        iri.approved_qty,
        iri.issued_qty,
        COALESCE(i.available_qty, 0) AS available_qty,
        COALESCE(i.average_cost, 0) AS average_cost,
        iri.created_at
      FROM inventory_request_items iri
      LEFT JOIN products p ON p.id = iri.product_id
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN inventories i
        ON i.product_id = iri.product_id
        AND i.warehouse_id = ?
        AND i.variant_id IS NULL
      WHERE iri.inventory_request_id = ?
      ORDER BY iri.id ASC
      `,
      [request.from_warehouse_id || 0, id]
    );

    res.json({
      success: true,
      request,
      items,
    });
  } catch (error) {
    console.error("Get inventory request by id error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory request",
      error: error.message,
    });
  }
};

exports.createInventoryRequest = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      request_number,
      request_type = "internal",
      from_warehouse_id,
      to_warehouse_id,
      request_date,
      required_date,
      status = "draft",
      remarks,
      items = [],
    } = req.body;

    if (!allowedRequestTypes.includes(request_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request type",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status",
      });
    }

    const itemError = validateItems(items);

    if (itemError) {
      return res.status(400).json({
        success: false,
        message: itemError,
      });
    }

    const normalizedItems = normalizeItems(items);

    await connection.beginTransaction();

    const [requestResult] = await connection.query(
      `
      INSERT INTO inventory_requests
        (
          request_number,
          request_type,
          requested_by,
          from_warehouse_id,
          to_warehouse_id,
          request_date,
          required_date,
          status,
          remarks
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        request_number || generateRequestNumber(),
        request_type,
        getUserId(req),
        cleanValue(from_warehouse_id),
        cleanValue(to_warehouse_id),
        request_date || new Date().toISOString().slice(0, 10),
        cleanValue(required_date),
        status,
        cleanValue(remarks),
      ]
    );

    const requestId = requestResult.insertId;

    for (const item of normalizedItems) {
      await connection.query(
        `
        INSERT INTO inventory_request_items
          (
            inventory_request_id,
            product_id,
            requested_qty,
            approved_qty,
            issued_qty
          )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          requestId,
          item.product_id,
          item.requested_qty,
          item.approved_qty || 0,
          item.issued_qty || 0,
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Inventory request created successfully",
      request_id: requestId,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create inventory request",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateInventoryRequest = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const {
      request_type,
      from_warehouse_id,
      to_warehouse_id,
      request_date,
      required_date,
      status,
      remarks,
      items,
    } = req.body;

    const [[request]] = await connection.query(
      `SELECT * FROM inventory_requests WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Inventory request not found",
      });
    }

    if (["fulfilled", "cancelled", "rejected"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: "Fulfilled, cancelled or rejected request cannot be edited",
      });
    }

    const finalRequestType = request_type || request.request_type;
    const finalStatus = status || request.status;

    if (!allowedRequestTypes.includes(finalRequestType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request type",
      });
    }

    if (!allowedStatuses.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status",
      });
    }

    let normalizedItems = null;

    if (items !== undefined) {
      const itemError = validateItems(items);

      if (itemError) {
        return res.status(400).json({
          success: false,
          message: itemError,
        });
      }

      normalizedItems = normalizeItems(items);
    }

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE inventory_requests
      SET
        request_type = ?,
        from_warehouse_id = ?,
        to_warehouse_id = ?,
        request_date = ?,
        required_date = ?,
        status = ?,
        remarks = ?
      WHERE id = ?
      `,
      [
        finalRequestType,
        from_warehouse_id === undefined
          ? request.from_warehouse_id
          : cleanValue(from_warehouse_id),
        to_warehouse_id === undefined
          ? request.to_warehouse_id
          : cleanValue(to_warehouse_id),
        request_date || request.request_date,
        required_date === undefined ? request.required_date : cleanValue(required_date),
        finalStatus,
        remarks === undefined ? request.remarks : cleanValue(remarks),
        id,
      ]
    );

    if (normalizedItems) {
      await connection.query(
        `DELETE FROM inventory_request_items WHERE inventory_request_id = ?`,
        [id]
      );

      for (const item of normalizedItems) {
        await connection.query(
          `
          INSERT INTO inventory_request_items
            (
              inventory_request_id,
              product_id,
              requested_qty,
              approved_qty,
              issued_qty
            )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            id,
            item.product_id,
            item.requested_qty,
            item.approved_qty || 0,
            item.issued_qty || 0,
          ]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Inventory request updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Update inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update inventory request",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.submitInventoryRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE inventory_requests
      SET status = 'submitted'
      WHERE id = ?
        AND status = 'draft'
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: "Only draft request can be submitted",
      });
    }

    res.json({
      success: true,
      message: "Inventory request submitted successfully",
    });
  } catch (error) {
    console.error("Submit inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit inventory request",
      error: error.message,
    });
  }
};

exports.approveInventoryRequest = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { items = [] } = req.body;

    await connection.beginTransaction();

    const [[request]] = await connection.query(
      `SELECT * FROM inventory_requests WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );

    if (!request) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Inventory request not found",
      });
    }

    if (!["submitted", "draft"].includes(request.status)) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Only draft or submitted request can be approved",
      });
    }

    const [dbItems] = await connection.query(
      `SELECT * FROM inventory_request_items WHERE inventory_request_id = ?`,
      [id]
    );

    if (!dbItems.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "No request items found",
      });
    }

    for (const dbItem of dbItems) {
      const payloadItem = items.find(
        (item) =>
          Number(item.id) === Number(dbItem.id) ||
          Number(item.product_id) === Number(dbItem.product_id)
      );

      const approvedQty =
        payloadItem?.approved_qty !== undefined
          ? toNumber(payloadItem.approved_qty)
          : toNumber(dbItem.requested_qty);

      await connection.query(
        `
        UPDATE inventory_request_items
        SET approved_qty = ?
        WHERE id = ?
        `,
        [approvedQty, dbItem.id]
      );
    }

    await connection.query(
      `
      UPDATE inventory_requests
      SET status = 'approved'
      WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Inventory request approved successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Approve inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve inventory request",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.fulfillInventoryRequest = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { items = [] } = req.body;
    const userId = getUserId(req);

    await connection.beginTransaction();

    const [[request]] = await connection.query(
      `SELECT * FROM inventory_requests WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id]
    );

    if (!request) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Inventory request not found",
      });
    }

    if (request.status !== "approved") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Only approved request can be fulfilled",
      });
    }

    if (!request.from_warehouse_id) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "From warehouse is required for fulfilment",
      });
    }

    const [dbItems] = await connection.query(
      `
      SELECT
        iri.*,
        p.name AS product_name
      FROM inventory_request_items iri
      LEFT JOIN products p ON p.id = iri.product_id
      WHERE iri.inventory_request_id = ?
      `,
      [id]
    );

    if (!dbItems.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "No request items found",
      });
    }

    for (const dbItem of dbItems) {
      const payloadItem = items.find(
        (item) =>
          Number(item.id) === Number(dbItem.id) ||
          Number(item.product_id) === Number(dbItem.product_id)
      );

      const issueQty =
        payloadItem?.issued_qty !== undefined
          ? toNumber(payloadItem.issued_qty)
          : toNumber(dbItem.approved_qty) || toNumber(dbItem.requested_qty);

      if (issueQty <= 0) continue;

      const [[fromInventory]] = await connection.query(
        `
        SELECT id, available_qty, average_cost
        FROM inventories
        WHERE warehouse_id = ?
          AND product_id = ?
          AND variant_id IS NULL
        LIMIT 1
        FOR UPDATE
        `,
        [request.from_warehouse_id, dbItem.product_id]
      );

      if (!fromInventory) {
        throw new Error(`Stock not found for ${dbItem.product_name || "product"}`);
      }

      const currentQty = toNumber(fromInventory.available_qty);
      const averageCost = toNumber(fromInventory.average_cost);

      if (currentQty < issueQty) {
        throw new Error(
          `Insufficient stock for ${dbItem.product_name || "product"}. Available: ${currentQty}, Required: ${issueQty}`
        );
      }

      const fromBalanceAfter = currentQty - issueQty;

      await connection.query(
        `
        UPDATE inventories
        SET available_qty = ?
        WHERE id = ?
        `,
        [fromBalanceAfter, fromInventory.id]
      );

      await connection.query(
        `
        INSERT INTO stock_movements
          (
            warehouse_id,
            product_id,
            batch_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            balance_after,
            created_by
          )
        VALUES (?, ?, NULL, 'out', ?, 'inventory_request', ?, ?, ?)
        `,
        [
          request.from_warehouse_id,
          dbItem.product_id,
          issueQty,
          id,
          fromBalanceAfter,
          userId,
        ]
      );

      if (request.to_warehouse_id) {
        const [[toInventory]] = await connection.query(
          `
          SELECT id, available_qty, average_cost
          FROM inventories
          WHERE warehouse_id = ?
            AND product_id = ?
            AND variant_id IS NULL
          LIMIT 1
          FOR UPDATE
          `,
          [request.to_warehouse_id, dbItem.product_id]
        );

        let toBalanceAfter = issueQty;

        if (toInventory) {
          const destinationQty = toNumber(toInventory.available_qty);
          const destinationAvgCost = toNumber(toInventory.average_cost);
          const totalQty = destinationQty + issueQty;

          let newAverageCost = averageCost;

          if (totalQty > 0) {
            newAverageCost =
              (destinationQty * destinationAvgCost + issueQty * averageCost) /
              totalQty;
          }

          toBalanceAfter = totalQty;

          await connection.query(
            `
            UPDATE inventories
            SET
              available_qty = ?,
              average_cost = ?
            WHERE id = ?
            `,
            [toBalanceAfter, newAverageCost, toInventory.id]
          );
        } else {
          await connection.query(
            `
            INSERT INTO inventories
              (
                warehouse_id,
                product_id,
                variant_id,
                available_qty,
                reserved_qty,
                damaged_qty,
                average_cost
              )
            VALUES (?, ?, NULL, ?, 0, 0, ?)
            `,
            [request.to_warehouse_id, dbItem.product_id, issueQty, averageCost]
          );
        }

        await connection.query(
          `
          INSERT INTO stock_movements
            (
              warehouse_id,
              product_id,
              batch_id,
              movement_type,
              quantity,
              reference_type,
              reference_id,
              balance_after,
              created_by
            )
          VALUES (?, ?, NULL, 'in', ?, 'inventory_request', ?, ?, ?)
          `,
          [
            request.to_warehouse_id,
            dbItem.product_id,
            issueQty,
            id,
            toBalanceAfter,
            userId,
          ]
        );
      }

      await connection.query(
        `
        UPDATE inventory_request_items
        SET issued_qty = ?
        WHERE id = ?
        `,
        [issueQty, dbItem.id]
      );
    }

    await connection.query(
      `
      UPDATE inventory_requests
      SET status = 'fulfilled'
      WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Inventory request fulfilled successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Fulfill inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fulfill inventory request",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.rejectInventoryRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const [result] = await db.query(
      `
      UPDATE inventory_requests
      SET
        status = 'rejected',
        remarks = COALESCE(?, remarks)
      WHERE id = ?
        AND status IN ('draft', 'submitted', 'approved')
      `,
      [cleanValue(remarks), id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: "Only draft, submitted or approved request can be rejected",
      });
    }

    res.json({
      success: true,
      message: "Inventory request rejected successfully",
    });
  } catch (error) {
    console.error("Reject inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reject inventory request",
      error: error.message,
    });
  }
};

exports.cancelInventoryRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE inventory_requests
      SET status = 'cancelled'
      WHERE id = ?
        AND status IN ('draft', 'submitted')
      `,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: "Only draft or submitted request can be cancelled",
      });
    }

    res.json({
      success: true,
      message: "Inventory request cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel inventory request",
      error: error.message,
    });
  }
};

exports.deleteInventoryRequest = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [[request]] = await connection.query(
      `SELECT id, status FROM inventory_requests WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!request) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Inventory request not found",
      });
    }

    if (request.status !== "draft") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Only draft request can be deleted",
      });
    }

    await connection.query(
      `DELETE FROM inventory_request_items WHERE inventory_request_id = ?`,
      [id]
    );

    await connection.query(`DELETE FROM inventory_requests WHERE id = ?`, [id]);

    await connection.commit();

    res.json({
      success: true,
      message: "Inventory request deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete inventory request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete inventory request",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};