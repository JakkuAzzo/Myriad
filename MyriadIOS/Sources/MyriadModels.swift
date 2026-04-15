import Foundation

enum MyriadJSONValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case object([String: MyriadJSONValue])
    case array([MyriadJSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Int.self) {
            self = .int(value)
        } else if let value = try? container.decode(Double.self) {
            self = .double(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([String: MyriadJSONValue].self) {
            self = .object(value)
        } else if let value = try? container.decode([MyriadJSONValue].self) {
            self = .array(value)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value):
            try container.encode(value)
        case .int(let value):
            try container.encode(value)
        case .double(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .object(let value):
            try container.encode(value)
        case .array(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

struct MyriadErrorBody: Codable {
    let error: String?
}

struct MyriadPrivacyStatus: Codable {
    let strictMode: Bool?
    let usingDefaultSalt: Bool?
    let warning: String?
}

struct MyriadHealthResponse: Codable {
    let status: String?
    let app: String?
    let users: Int?
    let privacy: MyriadPrivacyStatus?
}

struct MyriadUser: Codable, Identifiable {
    let id: Int
    let username: String
    let createdAt: String?
}

struct MyriadAuthResponse: Codable {
    let token: String?
    let user: MyriadUser?
}

struct MyriadAuthMeResponse: Codable {
    let user: MyriadUser?
}

struct MyriadConsentResponse: Codable {
    let enabled: Bool
}

struct MyriadSeedResponse: Codable {
    let seeded: Int?
}

struct MyriadImportResponse: Codable {
    let connector: String?
    let imported: Int?
}

struct MyriadDeleteResponse: Codable {
    let deleted: Bool?
}

struct MyriadReassignResponse: Codable {
    let updated: Int?
    let device: String?
}

struct MyriadGoal: Codable, Identifiable {
    let id: Int
    let title: String
    let category: String
    let device: String
    let maxDailyMinutes: Int
    let interventionPlan: String?
    let active: Bool?
    let createdAt: String?
    let updatedAt: String?
}

struct MyriadGoalsResponse: Codable {
    let goals: [MyriadGoal]
}

struct MyriadGoalPayload: Codable {
    let title: String
    let category: String
    let device: String
    let maxDailyMinutes: Int
    let interventionPlan: String
    let active: Bool
}

struct MyriadSummaryTotals: Codable {
    let totalEvents: Int?
    let totalMinutes: Int?
    let activeDays: Int?
}

struct MyriadHourBucket: Codable, Identifiable {
    var id: String { hour }
    let hour: String
    let count: Int
}

struct MyriadCategoryBucket: Codable, Identifiable {
    var id: String { category }
    let category: String
    let minutes: Int
}

struct MyriadSentimentPoint: Codable, Identifiable {
    var id: String { date }
    let date: String
    let avgSentiment: Double?
}

struct MyriadConversationPoint: Codable, Identifiable {
    var id: String { date }
    let date: String
    let messages: Int
}

struct MyriadTopicBucket: Codable, Identifiable {
    var id: String { topic ?? UUID().uuidString }
    let topic: String?
    let count: Int
}

struct MyriadDeviceBucket: Codable, Identifiable {
    var id: String { device ?? UUID().uuidString }
    let device: String?
    let events: Int
    let minutes: Int
}

struct MyriadPlatformBucket: Codable, Identifiable {
    var id: String { platform ?? UUID().uuidString }
    let platform: String?
    let events: Int
    let minutes: Int
}

struct MyriadSummaryResponse: Codable {
    let totals: MyriadSummaryTotals?
    let selectedDevice: String?
    let activeHours: [MyriadHourBucket]?
    let categoryUsage: [MyriadCategoryBucket]?
    let sentimentTrend: [MyriadSentimentPoint]?
    let conversationFrequency: [MyriadConversationPoint]?
    let topTopics: [MyriadTopicBucket]?
    let deviceBreakdown: [MyriadDeviceBucket]?
    let platformBreakdown: [MyriadPlatformBucket]?
}

struct MyriadCacheInfo: Codable {
    let hit: Bool?
    let key: String?
    let expiresAt: String?
}

struct MyriadAISummary: Codable {
    let narrative: String?
    let highlights: [String]?
    let confidence: String?
    let warnings: [String]?
    let generatedAt: String?
    let provider: String?
    let model: String?
}

struct MyriadEnhancedSummaryResponse: Codable {
    let aiSummary: MyriadAISummary?
    let cache: MyriadCacheInfo?
}

struct MyriadMultiDeviceSnapshot: Codable {
    let devices: [MyriadDeviceBucket]?
    let platforms: [MyriadPlatformBucket]?
}

struct MyriadGoalProgress: Codable, Identifiable {
    var id: Int { goal.id }
    let goal: MyriadGoal
    let trackedDays: Int?
    let totalMinutes: Int?
    let avgDailyMinutes: Double?
    let overLimitDays: Int?
    let percentToLimit: Double?
    let status: String?
}

struct MyriadRiskDetails: Codable {
    let overallScore: Int?
    let relapseRiskLevel: String?
    let recommendations: [String]?
}

struct MyriadIntervention: Codable, Identifiable {
    var id: Int { goalId }
    let goalId: Int
    let goalTitle: String?
    let status: String?
    let riskLevel: String?
    let actions: [String]?
    let riskDetails: MyriadRiskDetails?
}

struct MyriadPlanResponse: Codable {
    let windowDays: Int?
    let multiDeviceSnapshot: MyriadMultiDeviceSnapshot?
    let goalProgress: [MyriadGoalProgress]?
    let interventions: [MyriadIntervention]?
}

struct MyriadRiskByDevice: Codable, Identifiable {
    var id: String { device }
    let device: String
    let events: Int
    let totalMinutes: Int
}

struct MyriadTimeOfDayRisk: Codable {
    struct Hour: Codable, Identifiable {
        var id: String { hour }
        let hour: String
        let events: Int
        let totalMinutes: Int
    }

    let highRiskHours: [Hour]?
    let timeOfDayRiskScore: Int?
}

struct MyriadTrendAnalysis: Codable {
    let trend: String?
    let trendDirection: String?
    let overLimitCount: Int?
    let firstHalfAvg: Double?
    let secondHalfAvg: Double?
}

struct MyriadDeviceAnalysis: Codable {
    let riskByDevice: [MyriadRiskByDevice]?
    let highestRiskDevice: MyriadRiskByDevice?
}

struct MyriadRiskScore: Codable {
    let overallScore: Int?
    let relapseRiskLevel: String?
    let components: [String: MyriadJSONValue]?
    let trendAnalysis: MyriadTrendAnalysis?
    let timeOfDayAnalysis: MyriadTimeOfDayRisk?
    let deviceAnalysis: MyriadDeviceAnalysis?
    let recommendations: [String]?
}
