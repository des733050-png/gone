/**
 * GONEP Healthcare Marketplace
 * MongoDB Atlas — Schema Migration Script
 *
 * Usage:
 *   cd server
 *   node migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URL;

if (!uri) {
  console.error('\n❌  MONGODB_URL is not set in server/.env\n');
  process.exit(1);
}

// ── Schemas (mirrors all Mongoose models including new isApproved fields) ─────

const UserSchema = new mongoose.Schema({
  fullName:        { type: String, required: true },
  email:           { type: String, required: true, lowercase: true, unique: true },
  password:        { type: String, required: true, minlength: 5 },
  role:            { type: String, enum: ['admin', 'user', 'seller'], default: 'user' },
  shopName:        { type: String },
  shopAddress:     { type: String },
  isBlocked:       { type: Boolean, default: false },
  isApproved:      { type: Boolean, default: false },
  resetOtp:        { type: String },
  resetOTPExpires: { type: Date },
}, { timestamps: true });

const BrandSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  description: { type: String },
  isAdmin:     { type: Boolean, default: false },
  isApproved:  { type: Boolean, default: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'userInfo' },
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  description: { type: String },
  isAdmin:     { type: Boolean, default: false },
  isApproved:  { type: Boolean, default: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'userInfo' },
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand:       { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  stock:       { type: Number, min: 0, required: true },
  price:       { type: Number, min: 0, required: true },
  oldPrice:    { type: Number },
  image_url:   { type: String, required: true, trim: true },
  sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'userInfo', required: true },
  isSeller:    { type: Boolean, default: false },
}, { timestamps: true });

const CartSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'userInfo', required: true },
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { timestamps: true });

CartSchema.index({ user: 1, product: 1 }, { unique: true });

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'userInfo', required: true },
  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price:    { type: Number, required: true },
    seller:   { type: mongoose.Schema.Types.ObjectId, ref: 'userInfo' },
    status:   { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  }],
  shippingAddress: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    address: { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true },
  },
  paymentMethod: { type: String, default: 'COD' },
  subtotal:      { type: Number, required: true },
  shipping:      { type: Number, default: 0 },
  total:         { type: Number, required: true },
  status:        { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
}, { timestamps: true });

// ── Models ────────────────────────────────────────────────────────────────────

const models = [
  { name: 'userinfos',  model: mongoose.model('userInfo',  UserSchema) },
  { name: 'brands',     model: mongoose.model('Brand',     BrandSchema) },
  { name: 'categories', model: mongoose.model('Category',  CategorySchema) },
  { name: 'products',   model: mongoose.model('Product',   ProductSchema) },
  { name: 'carts',      model: mongoose.model('Cart',      CartSchema) },
  { name: 'orders',     model: mongoose.model('Order',     OrderSchema) },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('\n🔌  Connecting to MongoDB Atlas...');

  await mongoose.connect(uri);

  console.log('✅  Connected\n');

  for (const { name, model } of models) {
    process.stdout.write(`  ⟶  ${name.padEnd(14)}`);
    await model.syncIndexes();
    console.log('ready ✓');
  }

  console.log('\n✅  Migration complete — all collections and indexes are ready.\n');
  console.log('Next steps:');
  console.log('  node config/setupAdmin.js   ← create the admin account (first run only)');
  console.log('  npm run dev                 ← start the server\n');

  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('\n❌  Migration failed:', err.message, '\n');
  process.exit(1);
});