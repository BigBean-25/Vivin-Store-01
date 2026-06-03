import { useEffect, useState } from "react";
import API from "../../api/axios";
import {
  Edit3,
  Image as ImageIcon,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const initialForm = {
  alt_text: "",
  sort_order: 0,
  is_primary: false,
};

export default function ProductImageModal({ product, onClose }) {
  const [images, setImages] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [editingImageId, setEditingImageId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    return `${API_BASE_URL}${imagePath}`;
  };

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get(`/api/product-images/product/${product.id}`);

      if (res.data.success) {
        setImages(res.data.images || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch product images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product?.id) {
      fetchImages();
    }
  }, [product?.id]);

  const resetForm = () => {
    setFormData(initialForm);
    setImageFile(null);
    setPreviewUrl("");
    setEditingImageId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be below 5MB");
      return;
    }

    setError("");
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleEdit = (image) => {
    setEditingImageId(image.id);

    setFormData({
      alt_text: image.alt_text || "",
      sort_order: image.sort_order || 0,
      is_primary: image.is_primary === 1 || image.is_primary === true,
    });

    setImageFile(null);
    setPreviewUrl(getImageUrl(image.image_path));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!product?.id) {
      setError("Product is required");
      return;
    }

    if (!editingImageId && !imageFile) {
      setError("Please choose product image");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = new FormData();
      payload.append("product_id", product.id);
      payload.append("alt_text", formData.alt_text || "");
      payload.append("sort_order", formData.sort_order || 0);
      payload.append("is_primary", formData.is_primary ? "true" : "false");

      if (imageFile) {
        payload.append("image", imageFile);
      }

      let res;

      if (editingImageId) {
        res = await API.put(`/api/product-images/${editingImageId}`, payload);
      } else {
        res = await API.post("/api/product-images", payload);
      }

      if (res.data.success) {
        resetForm();
        fetchImages();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (editingImageId
            ? "Failed to update product image"
            : "Failed to upload product image")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      setError("");
      await API.patch(`/api/product-images/${imageId}/set-primary`);
      fetchImages();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to set primary image");
    }
  };

  const handleDelete = async (imageId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmDelete) return;

    try {
      setError("");
      await API.delete(`/api/product-images/${imageId}`);
      fetchImages();

      if (editingImageId === imageId) {
        resetForm();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete image");
    }
  };

  return (
    <div className="image-modal-overlay">
      <style>{`
        .image-modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.58); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .image-modal { width: 100%; max-width: 1050px; max-height: 92vh; overflow-y: auto; background: #ffffff; border-radius: 28px; box-shadow: 0 30px 90px rgba(0, 0, 0, 0.25); border: 1px solid #f1ded2; }
        .image-modal-header { position: sticky; top: 0; z-index: 5; background: radial-gradient(circle at top right, rgba(232,119,58,0.20), transparent 30%), linear-gradient(135deg, #ffffff, #fff8f3); border-bottom: 1px solid #f1ded2; padding: 22px 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
        .image-modal-title { display: flex; gap: 14px; align-items: flex-start; }
        .image-modal-icon { width: 50px; height: 50px; border-radius: 17px; background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 12px 26px rgba(232,119,58,0.26); }
        .image-modal-title h2 { margin: 0; font-size: 22px; font-weight: 950; color: #111; }
        .image-modal-title p { margin: 7px 0 0; color: #777; font-size: 13px; line-height: 1.5; }
        .modal-close-btn { width: 42px; height: 42px; border-radius: 14px; border: none; background: #fff; color: #333; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .image-modal-body { padding: 24px; }
        .error-box { background: #fff1f1; border: 1px solid #ffc9c9; color: #d63636; padding: 13px 15px; border-radius: 16px; margin-bottom: 18px; font-size: 13px; font-weight: 800; }
        .upload-panel { background: #fff; border: 1px solid #ececec; border-radius: 24px; padding: 22px; margin-bottom: 22px; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
        .upload-panel h3 { margin: 0 0 18px; font-size: 18px; font-weight: 950; color: #111; }
        .form-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group.full { grid-column: 1 / -1; }
        .form-group label { font-size: 13px; font-weight: 900; color: #333; }
        .form-group input { width: 100%; border: 1.5px solid #e8e8e8; border-radius: 14px; padding: 13px 14px; font-size: 14px; font-weight: 650; outline: none; box-sizing: border-box; font-family: inherit; }
        .upload-box { border: 1.5px dashed #e5c8b8; background: #fff8f3; border-radius: 20px; padding: 20px; display: flex; gap: 18px; align-items: center; }
        .upload-preview, .preview-placeholder { width: 135px; height: 135px; border-radius: 20px; border: 1px solid #f0ded2; background: #fff; flex-shrink: 0; }
        .upload-preview { object-fit: cover; }
        .preview-placeholder { display: flex; align-items: center; justify-content: center; color: #E8773A; }
        .upload-help { color: #777; font-size: 12.5px; font-weight: 700; margin-top: 8px; }
        .checkbox-line { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 850; color: #333; padding-top: 30px; }
        .checkbox-line input { width: 16px; height: 16px; }
        .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
        .primary-btn, .secondary-btn { border: none; height: 44px; padding: 0 18px; border-radius: 14px; display: flex; align-items: center; gap: 9px; font-weight: 900; cursor: pointer; white-space: nowrap; }
        .primary-btn { background: linear-gradient(135deg, #E8773A, #FF9A62); color: #fff; }
        .secondary-btn { background: #fff; color: #333; border: 1px solid #e8e8e8; }
        .image-list-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 0 0 16px; }
        .image-list-header h3 { margin: 0; font-size: 18px; font-weight: 950; color: #111; }
        .image-count { background: #fff4ee; color: #E8773A; border-radius: 999px; padding: 8px 12px; font-size: 12px; font-weight: 950; }
        .images-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .image-card { background: #fff; border: 1px solid #ececec; border-radius: 22px; overflow: hidden; box-shadow: 0 8px 26px rgba(0,0,0,0.04); }
        .image-card-img { width: 100%; height: 170px; object-fit: cover; background: #f6f6f6; display: block; }
        .image-card-body { padding: 14px; }
        .image-card-title { font-size: 13px; font-weight: 950; color: #111; margin-bottom: 6px; }
        .image-card-sub { font-size: 12px; font-weight: 700; color: #777; margin-bottom: 12px; }
        .primary-badge, .normal-badge { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 7px 10px; font-size: 11px; font-weight: 950; margin-bottom: 12px; }
        .primary-badge { background: #fff4ee; color: #E8773A; }
        .normal-badge { background: #f4f4f4; color: #777; }
        .image-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .icon-btn { width: 36px; height: 36px; border-radius: 12px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .star-btn { background: #fff9e8; color: #d79500; }
        .edit-btn { background: #fff4ee; color: #E8773A; }
        .delete-btn { background: #fff1f1; color: #d63636; }
        .empty-box { min-height: 170px; border: 1px dashed #ddd; border-radius: 20px; background: #fafafa; display: flex; align-items: center; justify-content: center; text-align: center; padding: 28px; }
        .empty-box h3 { margin: 0; font-size: 18px; font-weight: 950; }
        .empty-box p { margin: 8px 0 0; color: #777; font-size: 13px; }
        @media (max-width: 1000px) { .images-grid { grid-template-columns: repeat(2, 1fr); } .form-grid { grid-template-columns: 1fr; } }
        @media (max-width: 650px) { .image-modal-overlay { padding: 12px; } .image-modal-header, .upload-box { flex-direction: column; align-items: stretch; } .images-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="image-modal">
        <div className="image-modal-header">
          <div className="image-modal-title">
            <div className="image-modal-icon">
              <ImageIcon size={24} />
            </div>

            <div>
              <h2>Manage Product Images</h2>
              <p>
                Product: <strong>{product?.name}</strong> | Upload multiple
                images and set one as primary image.
              </p>
            </div>
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="image-modal-body">
          {error && <div className="error-box">{error}</div>}

          <div className="upload-panel">
            <h3>{editingImageId ? "Edit Image" : "Upload New Image"}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Alt Text</label>
                  <input
                    name="alt_text"
                    value={formData.alt_text}
                    onChange={handleChange}
                    placeholder="Fresh Tomato"
                  />
                </div>

                <div className="form-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={formData.sort_order}
                    onChange={handleChange}
                    placeholder="1"
                  />
                </div>

                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleChange}
                  />
                  Set as Primary
                </label>

                <div className="form-group full">
                  <label>
                    Choose Image {editingImageId ? "(optional)" : "*"}
                  </label>

                  <div className="upload-box">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="upload-preview"
                      />
                    ) : (
                      <div className="preview-placeholder">
                        <Upload size={34} />
                      </div>
                    )}

                    <div style={{ width: "100%" }}>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileChange}
                      />

                      <div className="upload-help">
                        Allowed: JPG, PNG, WEBP. Maximum size: 5MB.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                {editingImageId && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={resetForm}
                  >
                    Cancel Edit
                  </button>
                )}

                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingImageId
                    ? "Update Image"
                    : "Upload Image"}
                </button>
              </div>
            </form>
          </div>

          <div className="image-list-header">
            <h3>Uploaded Images</h3>
            <span className="image-count">{images.length} Images</span>
          </div>

          {loading ? (
            <div className="empty-box">
              <div>
                <h3>Loading images...</h3>
                <p>Please wait while product images are loading.</p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="empty-box">
              <div>
                <h3>No images uploaded</h3>
                <p>Choose an image and upload for this product.</p>
              </div>
            </div>
          ) : (
            <div className="images-grid">
              {images.map((image) => {
                const isPrimary =
                  image.is_primary === 1 || image.is_primary === true;

                return (
                  <div className="image-card" key={image.id}>
                    <img
                      src={getImageUrl(image.image_path)}
                      alt={image.alt_text || product?.name}
                      className="image-card-img"
                    />

                    <div className="image-card-body">
                      <div className="image-card-title">
                        {image.alt_text || "Product Image"}
                      </div>

                      <div className="image-card-sub">
                        Sort Order: {image.sort_order || 0}
                      </div>

                      {isPrimary ? (
                        <div className="primary-badge">
                          <Star size={12} />
                          Primary Image
                        </div>
                      ) : (
                        <div className="normal-badge">Normal Image</div>
                      )}

                      <div className="image-actions">
                        {!isPrimary && (
                          <button
                            className="icon-btn star-btn"
                            onClick={() => handleSetPrimary(image.id)}
                            title="Set Primary"
                          >
                            <Star size={16} />
                          </button>
                        )}

                        <button
                          className="icon-btn edit-btn"
                          onClick={() => handleEdit(image)}
                          title="Edit Image"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          className="icon-btn delete-btn"
                          onClick={() => handleDelete(image.id)}
                          title="Delete Image"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
