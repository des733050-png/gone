import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

function SellerRequestBrand() {
  document.title = 'Request Brand | Gonep';
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/seller/brands', formData);
      setFormData({ name: "", description: "" });
      setSuccess("Brand submitted! It will be available once admin approves it.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setErrors({ backend: err });
      setTimeout(() => setErrors({}), 4000);
    }
  };

  return (
    <div className="container mt-5 mb-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-lg p-4 rounded-4">
            <h4 className="mb-1">Request New Brand / Supplier</h4>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
              Submit a new pharmaceutical brand or supplier. Admin review required before use.
            </p>

            {success && <div className="alert alert-success py-2">{success}</div>}
            {errors.backend && <div className="alert alert-danger py-2">{errors.backend}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Brand / Supplier Name</label>
                <input type="text" className="form-control" placeholder="e.g. Dawa Ltd" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Description <span className="text-muted">(optional)</span></label>
                <input type="text" className="form-control" placeholder="Brief description" name="description" value={formData.description} onChange={handleChange} />
              </div>
              <div className="d-grid">
                <button type="submit" className="btn btn-primary btn-lg">Submit for Approval</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerRequestBrand;
