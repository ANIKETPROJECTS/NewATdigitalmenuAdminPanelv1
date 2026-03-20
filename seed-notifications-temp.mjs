import { MongoClient, ObjectId } from 'mongodb';

const MAIN_URI = 'mongodb+srv://raneaniket23_db_user:OiUJaUQdc1FsXmzn@atdigitalmenu.prd9tyh.mongodb.net/?appName=ATDIGITALMENU';
const RID = '69ba6603a8af0ad8f38bd253';

const main = await MongoClient.connect(MAIN_URI, { serverSelectionTimeoutMS: 10000 });
const restaurant = await main.db().collection('restaurants').findOne({ _id: new ObjectId(RID) });
if (!restaurant) { console.error('Restaurant not found'); await main.close(); process.exit(1); }
console.log('Restaurant:', restaurant.name, '| mongoUri present:', !!restaurant.mongoUri);

const restClient = await MongoClient.connect(restaurant.mongoUri, { serverSelectionTimeoutMS: 10000 });
const col = restClient.db('menupage').collection('notifications');

const now = new Date();
const mins = (m) => new Date(now.getTime() - m * 60 * 1000);

const samples = [
  { type: 'call_waiter', title: 'Waiter Called', message: 'Table 7 is requesting assistance.', read: false, createdAt: mins(2) },
  { type: 'reservation', title: 'New Reservation Booked', message: 'Priya Mehta reserved a table for 4 guests on 21 Mar 2026 at 8:00 PM.', read: false, createdAt: mins(15) },
  { type: 'customer', title: 'New Customer Registered', message: 'Rohan Sharma just signed up via the digital menu page.', read: false, createdAt: mins(42) },
  { type: 'call_waiter', title: 'Waiter Called', message: 'Table 3 requested assistance — resolved.', read: true, createdAt: mins(90) },
  { type: 'system', title: 'Menu Item Hidden', message: '"Paneer Butter Masala" was automatically hidden as it went out of stock.', read: true, createdAt: mins(180) },
  { type: 'reservation', title: 'Reservation Cancelled', message: 'Amit Joshi cancelled his booking for 20 Mar 2026 at 7:00 PM.', read: true, createdAt: mins(300) },
  { type: 'customer', title: 'New Customer Registered', message: 'Emily Carter joined and browsed the desserts menu.', read: false, createdAt: mins(480) },
];

await col.deleteMany({});
const result = await col.insertMany(samples);
console.log(`Inserted ${result.insertedCount} notifications successfully`);
await restClient.close();
await main.close();
