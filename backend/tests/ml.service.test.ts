import { env } from '../src/config/env'
import { classifyWithML } from '../src/services/ml.service'

const JSON_RESPONSE = (overrides: Record<string, unknown> = {}) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        status: 'success',
        category: 'Street Lights',
        category_confidence: 0.9,
        priority: 'High',
        priority_confidence: 0.8,
        recommended_department: 'Electricity',
        keywords: ['street light', 'near the park'],
        summary: 'Street light out near the park.',
        prediction_reason: 'Street lighting infrastructure.',
        is_duplicate: false,
        duplicate_similarity: 0.1,
        model_version: '1.0.0',
        ...overrides,
      }),
  })

describe('classifyWithML', () => {
  const baseUrl = 'http://ml.test'

  beforeEach(() => {
    env.ML_SERVICE_URL = baseUrl
    env.ML_SERVICE_TIMEOUT_MS = 200
  })

  afterEach(() => {
    env.ML_SERVICE_URL = ''
    jest.clearAllMocks()
  })

  it('returns null without calling the API when the service is disabled', async () => {
    env.ML_SERVICE_URL = ''
    global.fetch = jest.fn() as unknown as typeof fetch

    await expect(classifyWithML({ text: 'Some text' })).resolves.toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps a successful analyze response onto the backend classification shape', async () => {
    global.fetch = jest.fn().mockResolvedValue(JSON_RESPONSE()) as unknown as typeof fetch

    const result = await classifyWithML({ text: 'Street light out', location: 'Central Park', userId: 'u1' })

    expect(result).toEqual({
      category: 'ELECTRICITY',
      priority: 'HIGH',
      confidence: 0.9,
      keywords: ['street light', 'near the park'],
      suggestedDepartment: 'Electricity',
      summary: 'Street light out near the park.',
      predictionReason: 'Street lighting infrastructure.',
      isDuplicate: false,
      duplicateSimilarity: 0.1,
      modelVersion: '1.0.0',
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`${baseUrl}/api/v1/analyze`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      text: 'Street light out',
      complaint_id: null,
      location: 'Central Park',
      user_id: 'u1',
    })
  })

  it('falls back to null when the ML service is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch

    await expect(classifyWithML({ text: 'Water leak' })).resolves.toBeNull()
  })

  it('falls back to null on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    }) as unknown as typeof fetch

    await expect(classifyWithML({ text: 'Water leak' })).resolves.toBeNull()
  })

  it('falls back to null for an unknown ML category label', async () => {
    global.fetch = jest.fn().mockResolvedValue(JSON_RESPONSE({ category: 'Unmapped Label' })) as unknown as typeof fetch

    await expect(classifyWithML({ text: 'Unknown thing' })).resolves.toBeNull()
  })

  it('maps Drainage to SANITATION and Lowercase priority to MEDIUM', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        JSON_RESPONSE({ category: 'Drainage', priority: 'Low', recommended_department: 'Sanitation', keywords: ['blocked drain'] }),
      ) as unknown as typeof fetch

    const result = await classifyWithML({ text: 'Blocked drain' })
    expect(result).toMatchObject({ category: 'SANITATION', priority: 'LOW', suggestedDepartment: 'Sanitation' })
  })

  it('truncates input text to 2000 characters', async () => {
    global.fetch = jest.fn().mockResolvedValue(JSON_RESPONSE({ category: 'Other', priority: 'Medium' })) as unknown as typeof fetch

    await classifyWithML({ text: 'x'.repeat(3000) })
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.text).toHaveLength(2000)
  })
})