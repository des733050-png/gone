const Category = require('../models/category.model')

exports.getCategories = async (req, res) => {
  try {
    // Only return approved categories in public/seller dropdowns
    const categories = await Category.find({ isApproved: true }).sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}


const Brand = require('../models/brand.model');

exports.getBrands = async (req, res) => {
  try {
    // Only return approved brands in public/seller dropdowns
    const brands = await Brand.find({ isApproved: true }).sort({ name: 1 });
    res.json({ brands });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}
