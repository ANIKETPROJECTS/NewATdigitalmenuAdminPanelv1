import { Router } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { Restaurant } from '../models/Restaurant';
import { authenticateAdmin } from '../middleware/auth';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = Router();

// Connection pool for raw MongoClient (multi-database access)
const clientPool = new Map<string, MongoClient>();

async function getMongoClient(uri: string): Promise<MongoClient> {
  const existing = clientPool.get(uri);
  if (existing) {
    try {
      await existing.db('admin').command({ ping: 1 });
      return existing;
    } catch {
      clientPool.delete(uri);
    }
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
  await client.connect();
  clientPool.set(uri, client);
  return client;
}

const FIXED_DBS = new Set(['customersdb', 'hamburger', 'menupage', 'smartpicks', 'socialsandcontact', 'welcomescreen', 'admin', 'local', 'config']);

async function getMenuDbName(client: MongoClient): Promise<string> {
  const { databases } = await client.db().admin().listDatabases();
  const menuDbs = databases.filter(db => !FIXED_DBS.has(db.name));
  return menuDbs[0]?.name || '';
}

async function getRestaurantClient(restaurantId: string): Promise<{ client: MongoClient; mongoUri: string; restaurant: any }> {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw Object.assign(new Error('Restaurant not found'), { status: 404 });
  const mongoUri = restaurant.mongoUri as string;
  if (!mongoUri) throw Object.assign(new Error('Restaurant has no MongoDB URI configured'), { status: 400 });
  const client = await getMongoClient(mongoUri);
  return { client, mongoUri, restaurant };
}

function toObjectId(id: string) {
  try { return new ObjectId(id); } catch { return id; }
}

// ── Overview ──────────────────────────────────────────────────────────────────
router.get('/:restaurantId/overview', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const menuDbName = await getMenuDbName(client);

    const [menuCols, customers, reservations, coupons, categories] = await Promise.allSettled([
      menuDbName ? client.db(menuDbName).listCollections().toArray() : Promise.resolve([]),
      client.db('customersdb').collection('customers').countDocuments(),
      client.db('hamburger').collection('reservation').countDocuments(),
      client.db('menupage').collection('coupons').countDocuments({ show: true }),
      client.db('menupage').collection('categories').countDocuments(),
    ]);

    const collections = menuCols.status === 'fulfilled' ? menuCols.value : [];
    let totalMenuItems = 0;
    if (menuDbName && collections.length > 0) {
      const counts = await Promise.allSettled(
        collections.map(col => client.db(menuDbName).collection(col.name).countDocuments())
      );
      totalMenuItems = counts.reduce((sum, c) => sum + (c.status === 'fulfilled' ? c.value : 0), 0);
    }

    res.json({
      totalMenuItems,
      menuCategories: collections.length,
      customers: customers.status === 'fulfilled' ? customers.value : 0,
      reservations: reservations.status === 'fulfilled' ? reservations.value : 0,
      activeCoupons: coupons.status === 'fulfilled' ? coupons.value : 0,
      topLevelCategories: categories.status === 'fulfilled' ? categories.value : 0,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Menu Collections ──────────────────────────────────────────────────────────
router.get('/:restaurantId/menu-collections', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const menuDbName = await getMenuDbName(client);
    if (!menuDbName) return res.json([]);
    const SKIP = new Set(['cartitems', 'users']);
    const cols = await client.db(menuDbName).listCollections().toArray();
    res.json(cols.map(c => c.name).filter(n => !SKIP.has(n)));
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Menu Items ────────────────────────────────────────────────────────────────
router.get('/:restaurantId/menu-items', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const menuDbName = await getMenuDbName(client);
    if (!menuDbName) return res.json([]);
    const { category, search, isVeg, isAvailable, todaysSpecial, chefSpecial } = req.query as Record<string, string>;
    const SKIP = new Set(['cartitems', 'users']);
    const cols = (await client.db(menuDbName).listCollections().toArray()).map(c => c.name).filter(n => !SKIP.has(n));
    const targetCols = category ? [category] : cols;
    const filter: any = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (isVeg !== undefined) filter.isVeg = isVeg === 'true';
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    if (todaysSpecial === 'true') filter.todaysSpecial = true;
    if (chefSpecial === 'true') filter.chefSpecial = true;
    const results = await Promise.all(
      targetCols.map(async col => {
        const items = await client.db(menuDbName).collection(col).find(filter).toArray();
        return items.map(item => ({ ...item, _collection: col }));
      })
    );
    res.json(results.flat());
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.post('/:restaurantId/menu-items', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const menuDbName = await getMenuDbName(client);
    if (!menuDbName) return res.status(400).json({ message: 'No menu database found' });
    const { category, ...rest } = req.body;
    if (!category) return res.status(400).json({ message: 'category is required' });
    const doc = { ...rest, category, createdAt: new Date(), updatedAt: new Date() };
    const result = await client.db(menuDbName).collection(category).insertOne(doc);
    res.json({ ...doc, _id: result.insertedId });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/menu-items/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const menuDbName = await getMenuDbName(client);
    if (!menuDbName) return res.status(400).json({ message: 'No menu database found' });
    const { category, _collection, ...rest } = req.body;
    const col = category || _collection;
    if (!col) return res.status(400).json({ message: 'category/_collection is required' });
    const update = { $set: { ...rest, updatedAt: new Date() } };
    await client.db(menuDbName).collection(col).updateOne({ _id: toObjectId(req.params.id) }, update);
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.delete('/:restaurantId/menu-items/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const menuDbName = await getMenuDbName(client);
    if (!menuDbName) return res.status(400).json({ message: 'No menu database found' });
    const { category } = req.query as Record<string, string>;
    if (!category) return res.status(400).json({ message: 'category query param is required' });
    await client.db(menuDbName).collection(category).deleteOne({ _id: toObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Menu Page Categories ──────────────────────────────────────────────────────
router.get('/:restaurantId/categories', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const categories = await client.db('menupage').collection('categories').find({}).sort({ order: 1 }).toArray();
    res.json(categories);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.post('/:restaurantId/categories', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = { subcategories: [], ...req.body };
    const result = await client.db('menupage').collection('categories').insertOne(doc);
    res.json({ _id: result.insertedId, ...doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('categories').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.delete('/:restaurantId/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('categories').deleteOne({ _id: toObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Smart Picks ───────────────────────────────────────────────────────────────
router.get('/:restaurantId/smart-picks', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const picks = await client.db('smartpicks').collection('smartpickscategorie').find({}).sort({ order: 1 }).toArray();
    res.json(picks);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.post('/:restaurantId/smart-picks', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = { ...req.body };
    const result = await client.db('smartpicks').collection('smartpickscategorie').insertOne(doc);
    res.json({ _id: result.insertedId, ...doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/smart-picks/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('smartpicks').collection('smartpickscategorie').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.delete('/:restaurantId/smart-picks/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('smartpicks').collection('smartpickscategorie').deleteOne({ _id: toObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Carousel ──────────────────────────────────────────────────────────────────
router.get('/:restaurantId/carousel', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const items = await client.db('menupage').collection('carousel').find({}).sort({ order: 1 }).toArray();
    res.json(items);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.post('/:restaurantId/carousel', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const result = await client.db('menupage').collection('carousel').insertOne({ ...req.body });
    res.json({ _id: result.insertedId, ...req.body });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/carousel/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('carousel').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.delete('/:restaurantId/carousel/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('carousel').deleteOne({ _id: toObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Coupons ───────────────────────────────────────────────────────────────────
router.get('/:restaurantId/coupons', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const coupons = await client.db('menupage').collection('coupons').find({}).toArray();
    res.json(coupons);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.post('/:restaurantId/coupons', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const result = await client.db('menupage').collection('coupons').insertOne(req.body);
    res.json({ _id: result.insertedId, ...req.body });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/coupons/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('coupons').updateOne(
      { _id: toObjectId(req.params.id) },
      { $set: req.body }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.delete('/:restaurantId/coupons/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('coupons').deleteOne({ _id: toObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Customers ─────────────────────────────────────────────────────────────────
router.get('/:restaurantId/customers', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const { search, from, to, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter: any = {};
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { contactNumber: { $regex: search, $options: 'i' } }];
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const sortObj: any = { [sort]: order === 'asc' ? 1 : -1 };
    const [customers, total] = await Promise.all([
      client.db('customersdb').collection('customers').find(filter).sort(sortObj).skip((pageNum - 1) * limitNum).limit(limitNum).toArray(),
      client.db('customersdb').collection('customers').countDocuments(filter),
    ]);
    res.json({ customers, total, page: pageNum, limit: limitNum });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Reservations ──────────────────────────────────────────────────────────────
router.get('/:restaurantId/reservations', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const { date } = req.query as Record<string, string>;
    const filter: any = {};
    if (date) filter.date = date;
    const reservations = await client.db('hamburger').collection('reservation').find(filter).sort({ createdAt: -1 }).toArray();
    res.json(reservations);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Social Links ──────────────────────────────────────────────────────────────
router.get('/:restaurantId/social-links', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = await client.db('socialsandcontact').collection('link').findOne({});
    res.json(doc || {});
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/social-links', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const { _id, ...data } = req.body;
    await client.db('socialsandcontact').collection('link').updateOne({}, { $set: data }, { upsert: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Welcome Screen ────────────────────────────────────────────────────────────
router.get('/:restaurantId/welcome-screen', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = await client.db('welcomescreen').collection('welcomescreenui').findOne({});
    res.json(doc || {});
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/welcome-screen', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const { _id, ...data } = req.body;
    await client.db('welcomescreen').collection('welcomescreenui').updateOne({}, { $set: data }, { upsert: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Restaurant Info ───────────────────────────────────────────────────────────
router.get('/:restaurantId/restaurant-info', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = await client.db('hamburger').collection('restaurantinfo').findOne({});
    res.json(doc || {});
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/restaurant-info', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const { _id, ...data } = req.body;
    await client.db('hamburger').collection('restaurantinfo').updateOne({}, { $set: data }, { upsert: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Payment Details ───────────────────────────────────────────────────────────
router.get('/:restaurantId/payment-details', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = await client.db('hamburger').collection('paymentdetails').findOne({});
    res.json(doc || {});
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/payment-details', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const { _id, ...data } = req.body;
    await client.db('hamburger').collection('paymentdetails').updateOne({}, { $set: data }, { upsert: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Logo ──────────────────────────────────────────────────────────────────────
router.get('/:restaurantId/logo', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = await client.db('menupage').collection('logo').findOne({});
    res.json(doc || {});
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/logo', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const { _id, ...data } = req.body;
    await client.db('menupage').collection('logo').updateOne({}, { $set: data }, { upsert: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Call Waiter ───────────────────────────────────────────────────────────────
router.get('/:restaurantId/call-waiter', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = await client.db('menupage').collection('callwaiter').findOne({});
    res.json(doc || { called: false });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/call-waiter', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('callwaiter').updateOne({}, { $set: req.body }, { upsert: true });
    // Auto-create a notification when waiter is called
    if (req.body.called === true) {
      const tableNo = req.body.tableNumber || req.body.table || '';
      await client.db('menupage').collection('notifications').insertOne({
        type: 'call_waiter',
        title: 'Waiter Called',
        message: tableNo ? `Table ${tableNo} is requesting assistance.` : 'A customer is requesting waiter assistance.',
        read: false,
        createdAt: new Date(),
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/:restaurantId/notifications', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const docs = await client.db('menupage').collection('notifications')
      .find({}).sort({ createdAt: -1 }).limit(100).toArray();
    res.json(docs);
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.post('/:restaurantId/notifications', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    const doc = { ...req.body, read: false, createdAt: new Date() };
    const result = await client.db('menupage').collection('notifications').insertOne(doc);
    res.json({ ...doc, _id: result.insertedId });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/notifications/read-all', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('notifications').updateMany({}, { $set: { read: true } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:restaurantId/notifications/:id/read', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('notifications').updateOne(
      { _id: toObjectId(req.params.id) }, { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.delete('/:restaurantId/notifications/:id', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('notifications').deleteOne({ _id: toObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.delete('/:restaurantId/notifications', authenticateAdmin, async (req, res) => {
  try {
    const { client } = await getRestaurantClient(req.params.restaurantId);
    await client.db('menupage').collection('notifications').deleteMany({});
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// ── Image Upload (per-restaurant Cloudinary) ──────────────────────────────────
router.post('/:restaurantId/upload-image', authenticateAdmin, async (req: any, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const cloudName = (restaurant as any).cloudinaryCloudName;
    const apiKey = (restaurant as any).cloudinaryApiKey;
    const apiSecret = (restaurant as any).cloudinaryApiSecret;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({ message: 'This restaurant has no Cloudinary credentials configured. Please add them in the restaurant settings.' });
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const storage = new CloudinaryStorage({
      cloudinary: cloudinary as any,
      params: { folder: `menu-items/${req.params.restaurantId}`, allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] } as any,
    });

    const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).single('image');

    upload(req, res, (err) => {
      if (err) return res.status(500).json({ message: 'Upload failed', error: err.message });
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      res.json({ url: (req.file as any).path || (req.file as any).secure_url });
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

export default router;
