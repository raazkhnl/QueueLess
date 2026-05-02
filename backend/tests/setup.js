/**
 * Test setup — boots an in-memory MongoDB for every test run, points mongoose
 * at it, and tears down on completion. Keeps tests hermetic so CI doesn't need
 * a Mongo container.
 */
import { afterAll, beforeAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
