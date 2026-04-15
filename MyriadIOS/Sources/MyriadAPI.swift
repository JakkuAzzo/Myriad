import Foundation

enum MyriadAPIError: LocalizedError {
    case invalidBaseURL
    case server(String)
    case unexpectedResponse

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Enter a valid API base URL."
        case .server(let message):
            return message
        case .unexpectedResponse:
            return "Unexpected response from the server."
        }
    }
}

struct MyriadAPIClient {
    let baseURL: URL
    let token: String?

    private func url(for path: String, queryItems: [URLQueryItem] = []) -> URL? {
        let trimmedPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let targetURL = baseURL.appendingPathComponent(trimmedPath)
        guard var components = URLComponents(url: targetURL, resolvingAgainstBaseURL: false) else {
            return nil
        }
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        return components.url
    }

    private func makeRequest(path: String, method: String = "GET", queryItems: [URLQueryItem] = [], body: Data? = nil, includeAuth: Bool = true) throws -> URLRequest {
        guard let url = url(for: path, queryItems: queryItems) else {
            throw MyriadAPIError.invalidBaseURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("ios", forHTTPHeaderField: "x-myriad-client-platform")

        if includeAuth, let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        return request
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw MyriadAPIError.unexpectedResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            if let serverError = try? JSONDecoder().decode(MyriadErrorBody.self, from: data),
               let message = serverError.error {
                throw MyriadAPIError.server(message)
            }

            if let body = String(data: data, encoding: .utf8), !body.isEmpty {
                throw MyriadAPIError.server(body)
            }

            throw MyriadAPIError.unexpectedResponse
        }

        return data
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(type, from: data)
    }

    func health() async throws -> MyriadHealthResponse {
        let data = try await send(try makeRequest(path: "/api/health", includeAuth: false))
        return try decode(MyriadHealthResponse.self, from: data)
    }

    func me() async throws -> MyriadAuthMeResponse {
        let data = try await send(try makeRequest(path: "/api/auth/me"))
        return try decode(MyriadAuthMeResponse.self, from: data)
    }

    func login(username: String, password: String) async throws -> MyriadAuthResponse {
        let payload = ["username": username, "password": password]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        let data = try await send(try makeRequest(path: "/api/auth/login", method: "POST", body: body, includeAuth: false))
        return try decode(MyriadAuthResponse.self, from: data)
    }

    func register(username: String, password: String) async throws -> MyriadAuthResponse {
        let payload = ["username": username, "password": password]
        let body = try JSONSerialization.data(withJSONObject: payload, options: [])
        let data = try await send(try makeRequest(path: "/api/auth/register", method: "POST", body: body, includeAuth: false))
        return try decode(MyriadAuthResponse.self, from: data)
    }

    func consent() async throws -> MyriadConsentResponse {
        let data = try await send(try makeRequest(path: "/api/consent"))
        return try decode(MyriadConsentResponse.self, from: data)
    }

    func setConsent(enabled: Bool) async throws -> MyriadConsentResponse {
        let body = try JSONSerialization.data(withJSONObject: ["enabled": enabled], options: [])
        let data = try await send(try makeRequest(path: "/api/consent", method: "POST", body: body))
        return try decode(MyriadConsentResponse.self, from: data)
    }

    func summary(days: Int, device: String, scope: String, adminKey: String?) async throws -> MyriadSummaryResponse {
        let path = scope == "global" ? "/api/summary/global" : "/api/summary"
        var request = try makeRequest(
            path: path,
            queryItems: [
                URLQueryItem(name: "days", value: String(days)),
                URLQueryItem(name: "device", value: device),
            ]
        )
        if scope == "global", let adminKey, !adminKey.isEmpty {
            request.setValue(adminKey, forHTTPHeaderField: "x-myriad-admin-key")
        }
        let data = try await send(request)
        return try decode(MyriadSummaryResponse.self, from: data)
    }

    func enhancedSummary(days: Int, device: String, scope: String, adminKey: String?) async throws -> MyriadEnhancedSummaryResponse {
        var request = try makeRequest(
            path: "/api/summary/enhanced",
            queryItems: [
                URLQueryItem(name: "days", value: String(days)),
                URLQueryItem(name: "device", value: device),
                URLQueryItem(name: "scope", value: scope),
            ]
        )
        if scope == "global", let adminKey, !adminKey.isEmpty {
            request.setValue(adminKey, forHTTPHeaderField: "x-myriad-admin-key")
        }
        let data = try await send(request)
        return try decode(MyriadEnhancedSummaryResponse.self, from: data)
    }

    func goals() async throws -> MyriadGoalsResponse {
        let data = try await send(try makeRequest(path: "/api/habits/goals"))
        return try decode(MyriadGoalsResponse.self, from: data)
    }

    func saveGoal(payload: MyriadGoalPayload) async throws -> MyriadGoal {
        let body = try JSONEncoder().encode(payload)
        let data = try await send(try makeRequest(path: "/api/habits/goals", method: "POST", body: body))
        struct Wrapper: Codable { let goal: MyriadGoal }
        return try decode(Wrapper.self, from: data).goal
    }

    func deleteGoal(id: Int) async throws {
        _ = try await send(try makeRequest(path: "/api/habits/goals/\(id)", method: "DELETE"))
    }

    func habitPlan(days: Int) async throws -> MyriadPlanResponse {
        let data = try await send(try makeRequest(path: "/api/habits/plan", queryItems: [URLQueryItem(name: "days", value: String(days))]))
        return try decode(MyriadPlanResponse.self, from: data)
    }

    func risk(goalId: Int, days: Int) async throws -> MyriadRiskScore {
        let data = try await send(try makeRequest(path: "/api/habits/risk", queryItems: [URLQueryItem(name: "goalId", value: String(goalId)), URLQueryItem(name: "days", value: String(days))]))
        return try decode(MyriadRiskScore.self, from: data)
    }

    func seedDemoData() async throws -> MyriadSeedResponse {
        let data = try await send(try makeRequest(path: "/api/events/sample-seed", method: "POST", body: Data("{}".utf8)))
        return try decode(MyriadSeedResponse.self, from: data)
    }

    func importBrowserHistory(text: String, device: String) async throws -> MyriadImportResponse {
        let body = try JSONSerialization.data(withJSONObject: ["text": text, "device": device], options: [])
        let data = try await send(try makeRequest(path: "/api/import/browser-history", method: "POST", body: body))
        return try decode(MyriadImportResponse.self, from: data)
    }

    func importWhatsApp(text: String) async throws -> MyriadImportResponse {
        let body = try JSONSerialization.data(withJSONObject: ["text": text], options: [])
        let data = try await send(try makeRequest(path: "/api/import/whatsapp", method: "POST", body: body))
        return try decode(MyriadImportResponse.self, from: data)
    }

    func importTelegram(json: String) async throws -> MyriadImportResponse {
        let body = try JSONSerialization.data(withJSONObject: ["json": json], options: [])
        let data = try await send(try makeRequest(path: "/api/import/telegram", method: "POST", body: body))
        return try decode(MyriadImportResponse.self, from: data)
    }

    func reassignUnknownEvents(device: String) async throws -> MyriadReassignResponse {
        let body = try JSONSerialization.data(withJSONObject: ["device": device], options: [])
        let data = try await send(try makeRequest(path: "/api/events/reassign-unknown-device", method: "POST", body: body))
        return try decode(MyriadReassignResponse.self, from: data)
    }

    func exportEvents() async throws -> Data {
        try await send(try makeRequest(path: "/api/events/export"))
    }

    func deleteAllEvents() async throws -> MyriadDeleteResponse {
        let data = try await send(try makeRequest(path: "/api/events", method: "DELETE"))
        return try decode(MyriadDeleteResponse.self, from: data)
    }
}
