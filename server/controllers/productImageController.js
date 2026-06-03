const db = require("../config/db");
const fs = require("fs");
const path = require("path");

const isTrue = (value) => {
  return value === true || value === "true" || value === 1 || value === "1";
};

const getImagePath = (file) => {
  if (!file) return null;
  return `/uploads/product-images/${file.filename}`;
};

const deleteImageFile = (imagePath) => {
  if (!imagePath) return;

  const cleanPath = imagePath.replace(/^\/+/, "");
  const fullPath = path.join(__dirname, "..", cleanPath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

exports.getProductImages = async (req, res) => {
  try {
    const [images] = await db.query(`
      SELECT 
        pi.id,
        pi.product_id,
        p.name AS product_name,
        pi.image_path,
        pi.alt_text,
        pi.sort_order,
        pi.is_primary,
        pi.created_at
      FROM product_images pi
      LEFT JOIN products p ON pi.product_id = p.id
      ORDER BY pi.product_id DESC, pi.sort_order ASC, pi.id DESC
    `);

    res.json({
      success: true,
      count: images.length,
      images,
    });
  } catch (error) {
    console.error("Get product images error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product images",
      error: error.message,
    });
  }
};

exports.getImagesByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const [images] = await db.query(
      `
      SELECT 
        id,
        product_id,
        image_path,
        alt_text,
        sort_order,
        is_primary,
        created_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order ASC, id DESC
      `,
      [productId]
    );

    res.json({
      success: true,
      count: images.length,
      images,
    });
  } catch (error) {
    console.error("Get images by product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product images",
      error: error.message,
    });
  }
};

exports.createProductImage = async (req, res) => {
  try {
    const { product_id, alt_text, sort_order, is_primary } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }

    const [product] = await db.query(
      `
      SELECT id
      FROM products
      WHERE id = ?
      LIMIT 1
      `,
      [product_id]
    );

    if (product.length === 0) {
      deleteImageFile(getImagePath(req.file));

      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const imagePath = getImagePath(req.file);

    if (isTrue(is_primary)) {
      await db.query(
        `
        UPDATE product_images
        SET is_primary = FALSE
        WHERE product_id = ?
        `,
        [product_id]
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO product_images (
        product_id,
        image_path,
        alt_text,
        sort_order,
        is_primary
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        product_id,
        imagePath,
        alt_text || null,
        sort_order || 0,
        isTrue(is_primary),
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product image uploaded successfully",
      image_id: result.insertId,
      image_path: imagePath,
      image_url: `${req.protocol}://${req.get("host")}${imagePath}`,
    });
  } catch (error) {
    console.error("Upload product image error:", error);

    if (req.file) {
      deleteImageFile(getImagePath(req.file));
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload product image",
      error: error.message,
    });
  }
};

exports.getProductImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const [images] = await db.query(
      `
      SELECT 
        pi.*,
        p.name AS product_name
      FROM product_images pi
      LEFT JOIN products p ON pi.product_id = p.id
      WHERE pi.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product image not found",
      });
    }

    res.json({
      success: true,
      image: images[0],
    });
  } catch (error) {
    console.error("Get product image error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product image",
      error: error.message,
    });
  }
};

exports.updateProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, alt_text, sort_order, is_primary } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    const [oldImages] = await db.query(
      `
      SELECT image_path
      FROM product_images
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (oldImages.length === 0) {
      if (req.file) {
        deleteImageFile(getImagePath(req.file));
      }

      return res.status(404).json({
        success: false,
        message: "Product image not found",
      });
    }

    const oldImagePath = oldImages[0].image_path;
    const newImagePath = req.file ? getImagePath(req.file) : oldImagePath;

    if (isTrue(is_primary)) {
      await db.query(
        `
        UPDATE product_images
        SET is_primary = FALSE
        WHERE product_id = ?
        `,
        [product_id]
      );
    }

    const [result] = await db.query(
      `
      UPDATE product_images SET
        product_id = ?,
        image_path = ?,
        alt_text = ?,
        sort_order = ?,
        is_primary = ?
      WHERE id = ?
      `,
      [
        product_id,
        newImagePath,
        alt_text || null,
        sort_order || 0,
        isTrue(is_primary),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      if (req.file) {
        deleteImageFile(getImagePath(req.file));
      }

      return res.status(404).json({
        success: false,
        message: "Product image not found",
      });
    }

    if (req.file && oldImagePath) {
      deleteImageFile(oldImagePath);
    }

    res.json({
      success: true,
      message: "Product image updated successfully",
      image_path: newImagePath,
      image_url: `${req.protocol}://${req.get("host")}${newImagePath}`,
    });
  } catch (error) {
    console.error("Update product image error:", error);

    if (req.file) {
      deleteImageFile(getImagePath(req.file));
    }

    res.status(500).json({
      success: false,
      message: "Failed to update product image",
      error: error.message,
    });
  }
};

exports.setPrimaryImage = async (req, res) => {
  try {
    const { id } = req.params;

    const [images] = await db.query(
      `
      SELECT id, product_id
      FROM product_images
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product image not found",
      });
    }

    const productId = images[0].product_id;

    await db.query(
      `
      UPDATE product_images
      SET is_primary = FALSE
      WHERE product_id = ?
      `,
      [productId]
    );

    await db.query(
      `
      UPDATE product_images
      SET is_primary = TRUE
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      message: "Primary image updated successfully",
    });
  } catch (error) {
    console.error("Set primary image error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to set primary image",
      error: error.message,
    });
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const { id } = req.params;

    const [images] = await db.query(
      `
      SELECT image_path
      FROM product_images
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product image not found",
      });
    }

    const imagePath = images[0].image_path;

    const [result] = await db.query(
      `
      DELETE FROM product_images
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product image not found",
      });
    }

    deleteImageFile(imagePath);

    res.json({
      success: true,
      message: "Product image deleted successfully",
    });
  } catch (error) {
    console.error("Delete product image error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete product image",
      error: error.message,
    });
  }
};
