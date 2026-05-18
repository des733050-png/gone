const express = require('express');
const router = express.Router();

const sellerAuth = require('../middleware/sellerAuth');

const sellerController = require('../controllers/seller.controller');
const Category = require('../models/category.model');
const Brand = require('../models/brand.model');

router.get('/products', sellerAuth, sellerController.getSellerProducts);
router.get('/orders', sellerAuth, sellerController.getSellerOrders);
router.patch('/orders/:orderId/item/:itemId/status', sellerAuth, sellerController.updateItemStatus);
router.get('/earnings', sellerAuth, sellerController.getSellerEarnings);
router.get('/dashboard', sellerAuth, sellerController.getSellerDashboard);
router.get('/profile', sellerAuth, sellerController.getSellerProfile);
router.patch("/profile", sellerAuth, sellerController.updateSellerProfile);

// Seller: request a new category (pending admin approval)
router.post('/categories', sellerAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const existing = await Category.findOne({ name });
    if (existing) return res.status(400).json({ error: 'A category with this name already exists' });
    const category = await Category.create({ name, description, isAdmin: false, isApproved: false, createdBy: req.userData?.id });
    res.status(201).json({ message: 'Category submitted for admin approval', category });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit category' });
  }
});

// Seller: request a new brand (pending admin approval)
router.post('/brands', sellerAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Brand name is required' });
    const existing = await Brand.findOne({ name });
    if (existing) return res.status(400).json({ error: 'A brand with this name already exists' });
    const brand = await Brand.create({ name, description, isAdmin: false, isApproved: false, createdBy: req.userData?.id });
    res.status(201).json({ message: 'Brand submitted for admin approval', brand });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit brand' });
  }
});

module.exports = router;


