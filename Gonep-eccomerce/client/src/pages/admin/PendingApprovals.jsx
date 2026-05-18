import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { HashLoader } from "react-spinners";

function PendingApprovals() {
  document.title = 'Pending Approvals | Gonep';
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchPending = async () => {
    try {
      setLoading(true);
      const [catRes, brandRes] = await Promise.all([
        axiosInstance.get('/admin/categories/pending'),
        axiosInstance.get('/admin/brands/pending'),
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const approveCategory = async (id) => {
    try {
      await axiosInstance.patch(`/admin/categories/${id}/approve`);
      setMsg("Category approved!");
      fetchPending();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const rejectCategory = async (id) => {
    try {
      await axiosInstance.delete(`/admin/categories/${id}`);
      setMsg("Category rejected and removed.");
      fetchPending();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const approveBrand = async (id) => {
    try {
      await axiosInstance.patch(`/admin/brands/${id}/approve`);
      setMsg("Brand approved!");
      fetchPending();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  const rejectBrand = async (id) => {
    try {
      await axiosInstance.delete(`/admin/brands/${id}`);
      setMsg("Brand rejected and removed.");
      fetchPending();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <HashLoader color="var(--primary)" size={60} />
    </div>
  );

  return (
    <div className="container mt-4">
      <h5 className="border-bottom pb-2 mb-4">Pending Seller Approvals</h5>
      {msg && <div className="alert alert-success py-2 mb-3">{msg}</div>}

      {/* Categories */}
      <h6 className="mb-3" style={{ color: 'var(--primary)' }}>
        <i className="fa fa-list-alt me-2"></i>
        Categories ({categories.length})
      </h6>
      {categories.length === 0 ? (
        <p className="text-muted mb-4">No pending categories.</p>
      ) : (
        <div className="table-responsive mb-5">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Submitted by</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat._id}>
                  <td className="fw-semibold">{cat.name}</td>
                  <td>{cat.description || '—'}</td>
                  <td>{cat.createdBy?.shopName || cat.createdBy?.fullName || '—'}</td>
                  <td>
                    <button className="btn btn-success btn-sm me-2" onClick={() => approveCategory(cat._id)}>
                      <i className="fa fa-check me-1"></i> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => rejectCategory(cat._id)}>
                      <i className="fa fa-times me-1"></i> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Brands */}
      <h6 className="mb-3" style={{ color: 'var(--primary)' }}>
        <i className="fa fa-tags me-2"></i>
        Brands / Suppliers ({brands.length})
      </h6>
      {brands.length === 0 ? (
        <p className="text-muted">No pending brands.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Submitted by</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map(brand => (
                <tr key={brand._id}>
                  <td className="fw-semibold">{brand.name}</td>
                  <td>{brand.description || '—'}</td>
                  <td>{brand.createdBy?.shopName || brand.createdBy?.fullName || '—'}</td>
                  <td>
                    <button className="btn btn-success btn-sm me-2" onClick={() => approveBrand(brand._id)}>
                      <i className="fa fa-check me-1"></i> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => rejectBrand(brand._id)}>
                      <i className="fa fa-times me-1"></i> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PendingApprovals;
