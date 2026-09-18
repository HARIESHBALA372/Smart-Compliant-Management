process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/smart_complaint_test'
process.env.JWT_SECRET = 'test_secret_key_that_is_long_enough_1234'
process.env.JWT_EXPIRES_IN = '7d'
process.env.CLIENT_URL = 'http://localhost:3000'
process.env.PORT = '4100'
process.env.RATE_LIMIT_MAX = '1000'
process.env.LOGIN_RATE_LIMIT_MAX = '1000'
// Redis is disabled for the default Jest suite so it can run without a
// Redis server. Dedicated Redis integration tests opt in explicitly.
process.env.REDIS_ENABLED = process.env.REDIS_ENABLED ?? 'false'
process.env.REDIS_CONNECTION_STRING = process.env.REDIS_CONNECTION_STRING ?? 'redis://localhost:6379'
// The ML service is unreachable in CI — keep the default Jest suite on the
// rule-based classifier unless the test explicitly points elsewhere.
process.env.ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? ''
process.env.ML_SERVICE_TIMEOUT_MS = process.env.ML_SERVICE_TIMEOUT_MS ?? '200'